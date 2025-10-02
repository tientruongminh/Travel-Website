// upload.js - Version 2.0 (Compatible with spots.json structure)

const form = document.getElementById('uploadForm');
const mediaList = document.getElementById('mediaList');
const thumbPreview = document.getElementById('thumbPreview');

let mediaItems = [];
let thumbnailData = null;

// ============================================
// MEDIA TABS SWITCHING
// ============================================
const tabs = document.querySelectorAll('.media-tab');
const inputGroups = document.querySelectorAll('.media-input-group');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    inputGroups.forEach(g => g.classList.remove('active'));
    
    tab.classList.add('active');
    const targetTab = tab.dataset.tab;
    document.getElementById(targetTab + 'Input').classList.add('active');
  });
});

// ============================================
// THUMBNAIL UPLOAD
// ============================================
document.getElementById('thumbFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    alert('Ảnh thumbnail quá lớn! Vui lòng chọn ảnh dưới 2MB');
    e.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    thumbnailData = event.target.result;
    thumbPreview.innerHTML = `
      <img src="${thumbnailData}" alt="Thumbnail preview" />
      <div class="file-preview-info">
        <span class="file-preview-name">${file.name}</span>
        <button type="button" class="file-remove-btn" onclick="removeThumb()">Xóa</button>
      </div>
    `;
    thumbPreview.classList.add('active');
  };
  reader.readAsDataURL(file);
});

window.removeThumb = () => {
  thumbnailData = null;
  document.getElementById('thumbFile').value = '';
  thumbPreview.classList.remove('active');
};

// ============================================
// IMAGE UPLOAD (Multiple)
// ============================================
document.getElementById('imageFile').addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  
  files.forEach(file => {
    if (file.size > 2 * 1024 * 1024) {
      alert(`${file.name} quá lớn! Bỏ qua.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      mediaItems.push({
        type: 'image',
        url: event.target.result,
        name: file.name
      });
      renderMediaList();
    };
    reader.readAsDataURL(file);
  });

  e.target.value = '';
});

// ============================================
// VIDEO UPLOAD
// ============================================
document.getElementById('videoFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    alert('Video quá lớn! Vui lòng chọn video dưới 10MB');
    e.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    mediaItems.push({
      type: 'video',
      url: event.target.result,
      name: file.name
    });
    renderMediaList();
  };
  reader.readAsDataURL(file);
  e.target.value = '';
});

// ============================================
// YOUTUBE URL
// ============================================
document.getElementById('addYoutubeBtn').addEventListener('click', () => {
  const url = document.getElementById('youtubeUrl').value.trim();
  
  if (!url) {
    alert('Vui lòng nhập URL YouTube');
    return;
  }

  if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
    alert('URL không hợp lệ. Vui lòng nhập link YouTube');
    return;
  }

  mediaItems.push({
    type: 'youtube',
    url: url,
    name: 'YouTube Video'
  });
  
  renderMediaList();
  document.getElementById('youtubeUrl').value = '';
});

// ============================================
// RENDER MEDIA LIST
// ============================================
function renderMediaList() {
  if (mediaItems.length === 0) {
    mediaList.style.display = 'none';
    return;
  }

  mediaList.style.display = 'block';
  mediaList.innerHTML = mediaItems.map((item, index) => {
    const icon = item.type === 'image' ? '🖼️' : item.type === 'video' ? '🎬' : '▶️';
    const displayUrl = item.url.length > 50 ? item.url.substring(0, 50) + '...' : item.url;
    
    return `
      <div class="media-item">
        <div class="media-item-info">
          <span class="media-item-icon">${icon}</span>
          <div class="media-item-text">
            <div class="media-item-type">${item.type}</div>
            <div class="media-item-url">${item.name || displayUrl}</div>
          </div>
        </div>
        <button type="button" onclick="removeMedia(${index})">Xóa</button>
      </div>
    `;
  }).join('');
}

window.removeMedia = (index) => {
  mediaItems.splice(index, 1);
  renderMediaList();
};

// ============================================
// FORM SUBMIT
// ============================================
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Get form values
  const name = document.getElementById('name').value.trim();
  const type = document.getElementById('type').value;
  const category = document.getElementById('category').value;
  const desc = document.getElementById('desc').value.trim();
  const address = document.getElementById('address').value.trim();
  const hours = document.getElementById('hours').value.trim();
  const lat = parseFloat(document.getElementById('lat').value);
  const lng = parseFloat(document.getElementById('lng').value);

  // Validation
  if (!name || !type || !category) {
    alert('Vui lòng điền đầy đủ thông tin bắt buộc (*)');
    return;
  }

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    alert('Lat/Lng không hợp lệ');
    return;
  }

  // Create spot object (matching spots.json structure)
  const spot = {
    id: 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    name: name,
    type: type,
    category: category,
    lat: lat,
    lng: lng,
    address: address || '',
    hours: hours || 'Không rõ',
    desc: desc || '',
    thumb: thumbnailData || 'images/placeholder.jpg',
    media: mediaItems.length > 0 ? mediaItems : [],
    reviews: []
  };

  // Save to localStorage
  saveSpot(spot);
});

// ============================================
// SAVE FUNCTION
// ============================================
function saveSpot(spot) {
  try {
    // Get existing user spots
    const userSpots = JSON.parse(localStorage.getItem('qn_user_spots') || '[]');
    
    // Add new spot
    userSpots.push(spot);
    
    // Save back to localStorage
    localStorage.setItem('qn_user_spots', JSON.stringify(userSpots));
    
    alert('Đã lưu địa điểm: ' + spot.name + '\n\nMở trang chủ để xem trên bản đồ.');
    window.location.href = 'index.html';
    
  } catch (e) {
    console.error('Save error:', e);
    
    if (e.name === 'QuotaExceededError') {
      alert('Lưu thất bại. Dung lượng localStorage đã đầy!\n\nHãy:\n- Xóa bớt địa điểm cũ\n- Giảm kích thước ảnh/video\n- Dùng URL thay vì upload file');
    } else {
      alert('Lưu thất bại. Vui lòng thử lại.');
    }
  }
}

