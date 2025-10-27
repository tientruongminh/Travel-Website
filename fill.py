import json
import requests

def simple_clean_spots():
    input_file = '/home/tiencd/Travel-Website/data/spots.json'
    output_file = '/home/tiencd/Travel-Website/data/spots_cleaned.json'
    
    # Đọc file
    with open(input_file, 'r', encoding='utf-8') as f:
        spots = json.load(f)
    
    def check_url_simple(url):
        if not url or not url.startswith(('http://', 'https://')):
            return False
        try:
            response = requests.head(url, timeout=3, allow_redirects=True)
            return response.status_code == 200
        except:
            return False
    
    cleaned_spots = []
    removed_spots = 0
    removed_no_thumb = 0
    removed_bad_thumb = 0
    removed_no_media = 0
    removed_bad_media = 0
    
    for spot in spots:
        thumb_url = spot.get('thumb')
        media_list = spot.get('media', [])
        
        # Kiểm tra thumb
        if not thumb_url:
            removed_spots += 1
            removed_no_thumb += 1
            print(f"🗑️ Xóa (không có thumb): {spot.get('name', 'Unnamed')}")
            continue
            
        if not check_url_simple(thumb_url):
            removed_spots += 1
            removed_bad_thumb += 1
            print(f"🗑️ Xóa (thumb lỗi): {spot.get('name', 'Unnamed')}")
            continue
        
        # Kiểm tra media
        if not media_list or not isinstance(media_list, list):
            removed_spots += 1
            removed_no_media += 1
            print(f"🗑️ Xóa (không có media): {spot.get('name', 'Unnamed')}")
            continue
        
        # Kiểm tra có ít nhất một media hoạt động
        has_valid_media = False
        valid_media = []
        for media in media_list:
            if media.get('url') and check_url_simple(media['url']):
                has_valid_media = True
                valid_media.append(media)
        
        if not has_valid_media:
            removed_spots += 1
            removed_bad_media += 1
            print(f"🗑️ Xóa (không có media hoạt động): {spot.get('name', 'Unnamed')}")
            continue
        
        # GIỮ LẠI: có thumb hoạt động VÀ có ít nhất một media hoạt động
        spot['media'] = valid_media
        cleaned_spots.append(spot)
        print(f"✅ Giữ lại: {spot.get('name', 'Unnamed')} - {len(valid_media)} media hoạt động")
    
    # Lưu file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(cleaned_spots, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Đã lọc xong!")
    print(f"📊 Kết quả: {len(cleaned_spots)}/{len(spots)} spots được giữ lại")
    print(f"🗑️ Đã xóa: {removed_spots} spots")
    print(f"   • Không có thumb: {removed_no_thumb}")
    print(f"   • Thumb lỗi: {removed_bad_thumb}")
    print(f"   • Không có media: {removed_no_media}")
    print(f"   • Không có media hoạt động: {removed_bad_media}")
    print(f"📁 File output: {output_file}")

# Chạy phiên bản đơn giản
simple_clean_spots()