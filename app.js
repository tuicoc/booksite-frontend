// ============================
// FRONTEND SCRIPT - BOOKSITE
// ============================
const API_BASE = 'https://booksite-backend-production.up.railway.app/api';
let token = localStorage.getItem('jwt') || null;
let currentUser = token ? parseJwt(token) : null;

function parseJwt(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch (e) {
    return null;
  }
}

// ---------- COMMON UI ----------
const nav = document.getElementById('nav');
const menuToggle = document.getElementById('menu-toggle');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');

if (menuToggle) menuToggle.addEventListener('click', () => nav.classList.toggle('show'));

// Chuyển đến trang auth.html khi click đăng nhập
if (btnLogin) {
  btnLogin.addEventListener('click', () => {
    window.location.href = 'auth.html';
  });
}

// Xử lý đăng xuất
if (btnLogout) {
  btnLogout.addEventListener('click', () => {
    localStorage.removeItem('jwt');
    token = null;
    currentUser = null;
    window.location.reload();
  });
}

function applyAfterLogin() {
  if (!currentUser) {
    // Chưa đăng nhập - hiện nút đăng nhập
    if (btnLogin) btnLogin.style.display = 'inline-block';
    if (btnLogout) btnLogout.style.display = 'none';
    return;
  }
  
  // Đã đăng nhập - hiện tên user và nút đăng xuất
  if (btnLogin) {
    btnLogin.innerText = currentUser.displayName || currentUser.sub || 'User';
    btnLogin.style.cursor = 'default';
    btnLogin.style.display = 'inline-block';
    // Không chuyển trang khi đã đăng nhập
    btnLogin.onclick = null;
  }
  
  if (btnLogout) {
    btnLogout.style.display = 'inline-block';
  }
  
  // Admin controls
  const ctrl = document.getElementById('admin-controls');
  if (ctrl && currentUser.roles && currentUser.roles.includes('ROLE_ADMIN')) {
    const b = document.createElement('button');
    b.className = 'pill';
    b.id = 'btn-addbook';
    b.innerText = '+ Add Book';
    b.addEventListener('click', () => {
      document.getElementById('addbook-modal').classList.remove('hidden');
    });
    ctrl.appendChild(b);
  }
}

// ---------- PAGE INIT ----------
document.addEventListener('DOMContentLoaded', () => {
  applyAfterLogin();
  const p = location.pathname.split('/').pop();
  if (p === 'books.html') initBooksPage();
  if (p === 'index.html' || p === '') initIndexPage();

  // smooth scroll footer
  const contactLink = document.getElementById('nav-contact');
  if (contactLink) {
    contactLink.addEventListener('click', (e) => {
      e.preventDefault();
      const footer = document.getElementById('contact');
      if (footer) footer.scrollIntoView({ behavior: 'smooth' });
      if (nav && nav.classList.contains('show')) nav.classList.remove('show');
    });
  }
});

function initIndexPage() {
  const btn = document.getElementById('btn-featured');
  if (btn) btn.addEventListener('click', () => (location.href = 'books.html'));
}

// ---------- BOOKS PAGE ----------
async function initBooksPage() {
  let page = 0;
  const size = 10;
  const list = document.getElementById('books-list');
  const loadMore = document.getElementById('load-more');

  async function load() {
    const res = await fetch(API_BASE + '/books?page=' + page + '&size=' + size);
    const data = await res.json();
    data.forEach((b) => {
      const div = document.createElement('div');
      div.className = 'book-item';
      const imageUrl = b.imagePath.startsWith('/uploads/')
        ? `https://booksite-backend-production.up.railway.app:8080${b.imagePath}`
        : `https://booksite-backend-production.up.railway.app:8080/uploads/${b.imagePath}`;

      div.innerHTML = `
        <img data-src="${imageUrl}" alt="${b.title}" class="lazy">
        <div class="book-meta">
          <h3>${b.title}</h3>
          <p>${b.description}</p>
         
        </div>
      `;

      list.appendChild(div);
    });
    initLazyLoad();
    page++;
    if (data.length < size) loadMore.style.display = 'none';
  }
  load();
  loadMore.addEventListener('click', load);

  // Close addbook modal
  const closeAddbook = document.getElementById('close-addbook');
  if (closeAddbook) {
    closeAddbook.addEventListener('click', () => {
      document.getElementById('addbook-modal').classList.add('hidden');
    });
  }

  // File input display name
  const fileInput = document.getElementById('bookImage');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const fileName = e.target.files[0]?.name || 'Chọn ảnh bìa sách...';
      document.getElementById('file-name').innerText = fileName;
    });
  }

  // add book form (upload file)
  const addForm = document.getElementById('addBookForm');
  if (addForm)
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData();
      formData.append('title', document.getElementById('bookTitle').value);
      formData.append('description', document.getElementById('bookDescription').value);
      formData.append('image', document.getElementById('bookImage').files[0]);

      const res = await fetch(API_BASE + '/books/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        alert('Book uploaded!');
        document.getElementById('addbook-modal').classList.add('hidden');
        location.reload();
      } else {
        alert('Upload failed');
      }
    });

  // discussion modal
  window.openDiscussion = async function (bookId, title) {
    const modal = document.getElementById('discussion-modal');
    modal.classList.remove('hidden');
    document.getElementById('discussion-title').innerText = 'Discussion - ' + title;
    const listEl = document.getElementById('discussion-list');
    listEl.innerHTML = 'Loading...';

    const res = await fetch(API_BASE + '/comments?bookId=' + bookId);
    const msgs = await res.json();
    listEl.innerHTML = '';
    msgs.forEach((m) => {
      const el = document.createElement('div');
      el.style.padding = '8px';
      el.style.borderBottom = '1px solid #eee';
      el.innerHTML = '<strong>' + m.displayName + '</strong> <div style="font-size:13px">' + m.content + '</div>';
      listEl.appendChild(el);
    });

    document.getElementById('send-discussion').onclick = async () => {
      const text = document.getElementById('discussion-input').value;
      if (!text) return alert('Write something');
      const res2 = await fetch(API_BASE + '/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + (localStorage.getItem('jwt') || ''),
        },
        body: JSON.stringify({ bookId, content: text }),
      });
      if (res2.ok) {
        document.getElementById('discussion-input').value = '';
        modal.classList.add('hidden');
        initBooksPage();
      } else alert('Please login to comment');
    };
  };
  document.getElementById('close-discussion').addEventListener('click', () =>
    document.getElementById('discussion-modal').classList.add('hidden')
  );
}

// ---------- LAZY LOAD ----------
function initLazyLoad() {
  const lazyImgs = document.querySelectorAll('img.lazy');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.remove('lazy');
        io.unobserve(img);
      }
    });
  });
  lazyImgs.forEach((img) => io.observe(img));
}
