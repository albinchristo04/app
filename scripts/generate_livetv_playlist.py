
import xml.etree.ElementTree as ET
import requests
from bs4 import BeautifulSoup
import re
from concurrent.futures import ThreadPoolExecutor
import logging

# Configuration du logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def find_web_player_links(event_url):
    """
    Visite une page d'événement de livetv.sx et cherche des liens de lecteurs web.
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://livetv.sx/es/'
        }
        response = requests.get(event_url, headers=headers, timeout=15, verify=False)
        if response.status_code != 200:
            logging.warning(f"Impossible d'accéder à {event_url}, status code: {response.status_code}")
            return []

        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Cible les liens qui sont dans des cellules de tableau avec une description de lecteur
        # et qui ne contiennent pas 'acestream' dans leur URL.
        player_links = []
        
        # Stratégie 1: Chercher les liens dans les descriptions de diffusion
        broadcast_tables = soup.find_all('table', class_=re.compile(r'broadc(a|á)st'))
        for table in broadcast_tables:
            rows = table.find_all('tr')
            for row in rows:
                link_cell = row.find('td', class_='live')
                if link_cell:
                    link = link_cell.find('a', href=True)
                    if link and 'acestream:' not in link['href'] and 'sop:' not in link['href']:
                        # Essayer d'obtenir une URL plus directe si elle est cachée
                        onclick_attr = link.get('onclick')
                        if onclick_attr:
                            # Extrait l'URL d'une fonction JavaScript comme "return cl(this, '...'))"
                            match = re.search(r"cl\(this, '(.+?)'\)", onclick_attr)
                            if match:
                                player_url = f"https://livetv.sx{match.group(1)}"
                                player_links.append(player_url)
                                logging.info(f"Lien de lecteur web trouvé (via JS) : {player_url}")
                        else:
                            player_url = link['href']
                            if not player_url.startswith('http'):
                                player_url = f"https://livetv.sx{player_url}"
                            player_links.append(player_url)
                            logging.info(f"Lien de lecteur web trouvé : {player_url}")

        # Si aucune table de diffusion n'est trouvée, essayer une recherche plus générale
        if not player_links:
            all_links = soup.find_all('a', href=re.compile(r'/es/showvideo/\d+/|/es/webplayer/\d+/'))
            for link in all_links:
                if 'acestream:' not in link['href']:
                    player_url = link['href']
                    if not player_url.startswith('http'):
                        player_url = f"https://livetv.sx{player_url}"
                    player_links.append(player_url)
                    logging.info(f"Lien de lecteur web trouvé (général) : {player_url}")

        return player_links

    except requests.RequestException as e:
        logging.error(f"Erreur de requête pour {event_url}: {e}")
        return []
    except Exception as e:
        logging.error(f"Erreur inattendue pour {event_url}: {e}")
        return []

def generate_playlist_from_xml(xml_path, output_m3u_path):
    """
    Génère une playlist M3U à partir du fichier XML d'événements.
    """
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
    except FileNotFoundError:
        logging.critical(f"Le fichier XML '{xml_path}' n'a pas été trouvé. Exécutez d'abord le script principal.")
        return

    events = root.findall('evento')
    playlist_entries = []
    
    # Utiliser ThreadPoolExecutor pour paralléliser les requêtes
    with ThreadPoolExecutor(max_workers=10) as executor:
        future_to_event = {executor.submit(find_web_player_links, event.find('url').text): event for event in events}
        
        for future in future_to_event:
            event_element = future_to_event[future]
            try:
                web_player_links = future.result()
                if web_player_links:
                    event_name = event_element.find('nombre').text
                    event_time = event_element.find('hora').text
                    
                    # Pour chaque lien de lecteur trouvé, créer une entrée
                    for i, link in enumerate(web_player_links):
                        entry_name = f"{event_time} - {event_name} (Lien {i+1})"
                        playlist_entries.append(f"#EXTM3U\n{entry_name}\n{link}\n")
            except Exception as exc:
                logging.error(f"Une erreur est survenue lors du traitement d'un événement: {exc}")

    # Écrire la playlist M3U
    if playlist_entries:
        with open(output_m3u_path, 'w', encoding='utf-8') as f:
            f.write("#EXTM3U\n")
            for entry in playlist_entries:
                f.write(entry)
        logging.info(f"Playlist M3U générée avec succès : '{output_m3u_path}' avec {len(playlist_entries)} liens.")
    else:
        logging.warning("Aucun lien de lecteur web n'a été trouvé. La playlist est vide.")

if __name__ == "__main__":
    xml_file = '../platinsport-m3u-updater/eventos_livetv_sx.xml'
    m3u_file = '../www/livetv_events.m3u'
    generate_playlist_from_xml(xml_file, m3u_file)
