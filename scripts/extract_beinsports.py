# This script extracts Bein Sports channels from an M3U file.

input_file_path = "C:/Users/DELL/Desktop/m3u/Nuova cartella/lis.m3u"
output_file_path = "C:/Users/DELL/Desktop/APP/beinsportgit.m3u"

try:
    with open(input_file_path, 'r', encoding='utf-8') as infile, \
         open(output_file_path, 'w', encoding='utf-8') as outfile:
        
        lines = infile.readlines()
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            if line.startswith('#EXTINF'):
                # Check if 'bein' or 'beinsports' is in the #EXTINF line (case-insensitive)
                if "bein" in line.lower() or "beinsports" in line.lower():
                    # Write the #EXTINF line
                    outfile.write(line + '\n')
                    # Check if there is a next line for the URL
                    if i + 1 < len(lines):
                        # Write the URL line
                        outfile.write(lines[i+1].strip() + '\n')
                    i += 1 # Move to the next line (URL)
            i += 1
    print(f"Extraction completed. Bein Sports channels saved to {output_file_path}")
except FileNotFoundError:
    print(f"Error: The input file {input_file_path} was not found.")
except Exception as e:
    print(f"An error occurred: {e}")
