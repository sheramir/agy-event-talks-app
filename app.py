import os
import re
import time
import requests
import xml.etree.ElementTree as ET
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_DURATION = 300  # Cache feed for 5 minutes in memory

class FeedCache:
    def __init__(self):
        self.data = None
        self.last_fetched = 0

feed_cache = FeedCache()

def parse_release_notes(xml_content):
    """
    Parses the Atom feed XML content and extracts individual release updates.
    """
    root = ET.fromstring(xml_content)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    entries = root.findall('atom:entry', ns)
    
    parsed_updates = []
    
    for entry_idx, entry in enumerate(entries):
        date_str = entry.find('atom:title', ns).text
        
        # Parse update timestamp
        updated_elem = entry.find('atom:updated', ns)
        updated_time = updated_elem.text if updated_elem is not None else ""
        
        # Link to specific update
        link_elem = entry.find('atom:link', ns)
        link = link_elem.attrib.get('href') if link_elem is not None else ""
        
        content_elem = entry.find('atom:content', ns)
        if content_elem is None or not content_elem.text:
            continue
            
        content_html = content_elem.text
        
        # Split content by <h3> headers to get individual updates
        parts = re.split(r'<h3>(.*?)</h3>', content_html)
        
        if len(parts) == 1:
            # If no <h3> header is found, treat the whole content as one general update
            clean_text = re.sub(r'<[^<]+?>', '', content_html)
            clean_text = " ".join(clean_text.split())
            parsed_updates.append({
                "id": f"update-{entry_idx}-0",
                "date": date_str,
                "timestamp": updated_time,
                "type": "General",
                "html": content_html,
                "text": clean_text,
                "link": link
            })
            continue
            
        # Extract matches
        # The split results in: [text_before, type1, html1, type2, html2, ...]
        for i in range(1, len(parts), 2):
            update_type = parts[i].strip()
            update_html = parts[i+1].strip() if i+1 < len(parts) else ""
            
            # Extract plain text for tweeting and search
            clean_text = re.sub(r'<[^<]+?>', '', update_html)
            clean_text = " ".join(clean_text.split())
            
            # Determine specific update link anchor if available in entry
            # Usually the link is like /release-notes#June_15_2026
            update_id = f"update-{entry_idx}-{i//2}"
            
            parsed_updates.append({
                "id": update_id,
                "date": date_str,
                "timestamp": updated_time,
                "type": update_type,
                "html": update_html,
                "text": clean_text,
                "link": link
            })
            
    return parsed_updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/feed')
def get_feed():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    # Check cache
    if not force_refresh and feed_cache.data and (current_time - feed_cache.last_fetched < CACHE_DURATION):
        return jsonify({
            "source": "cache",
            "last_fetched": feed_cache.last_fetched,
            "updates": feed_cache.data
        })
        
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        
        updates = parse_release_notes(response.content)
        
        # Update cache
        feed_cache.data = updates
        feed_cache.last_fetched = current_time
        
        return jsonify({
            "source": "network",
            "last_fetched": feed_cache.last_fetched,
            "updates": updates
        })
    except Exception as e:
        # Fallback to cache if network call fails
        if feed_cache.data:
            return jsonify({
                "source": "cache_fallback",
                "error": str(e),
                "last_fetched": feed_cache.last_fetched,
                "updates": feed_cache.data
            })
        return jsonify({
            "error": f"Failed to fetch feed: {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=8080)
