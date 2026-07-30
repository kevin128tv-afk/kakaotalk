document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('username', document.getElementById('username').value);
    formData.append('password', document.getElementById('password').value);
    formData.append('nickname', document.getElementById('nickname').value);
    const file = document.getElementById('profileImage').files[0];
    if (file) formData.append('profileImage', file);

    try {
        const res = await fetch('/api/auth/register', { method: 'POST', body: formData });
        const data = await res.json();
        alert(data.message);
        if (res.ok && data.success) location.href = 'login.html';
    } catch (err) {
        alert('네트워크 오류');
    }
});