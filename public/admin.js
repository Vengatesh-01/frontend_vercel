const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('owner_token')}`
});

async function loadStats() {
    try {
        const res = await fetch('http://localhost:5000/api/admin/owner/stats', { headers: getAuthHeaders() });
        if (res.status === 401) return window.location.href = '/owner.html';
        const data = await res.json();
        document.getElementById('userCount').innerText = data.users;
        document.getElementById('postCount').innerText = data.posts;
        document.getElementById('reelCount').innerText = data.reels;
        document.getElementById('updateCount').innerText = data.updates;
    } catch (err) { console.error('Failed to load stats', err); }
}

async function loadUpdates() {
    try {
        const res = await fetch('http://localhost:5000/api/admin/owner/updates', { headers: getAuthHeaders() });
        const data = await res.json();
        const list = document.getElementById('updateList');
        list.innerHTML = data.map(u => `
            <div class="update-item">
                <strong>${new Date(u.createdAt).toLocaleDateString()}</strong>: ${u.message} 
                <span style="color: ${u.forceShow ? 'red' : 'green'}">(${u.forceShow ? 'Blocking' : 'Banner'})</span>
            </div>
        `).join('');
    } catch (err) { console.error('Failed to load updates', err); }
}

document.getElementById('updateForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = document.getElementById('updateMessage').value;
    const forceShow = document.getElementById('forceShow').checked;

    try {
        const res = await fetch('http://localhost:5000/api/admin/owner/updates', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ message, forceShow })
        });
        if (res.ok) {
            document.getElementById('updateMessage').value = '';
            loadUpdates();
            alert('Update published!');
        }
    } catch (err) { alert('Failed to publish'); }
});

async function moderate(type) {
    const id = type === 'user' ? document.getElementById('targetIdUser').value : document.getElementById('targetIdPost').value;
    const status = type === 'user' ? document.getElementById('userStatus').value : document.getElementById('postStatus').value;

    if (!id) return alert('Enter an ID');

    try {
        const endpoint = type === 'user' ? 'http://localhost:5000/api/admin/owner/moderate/user' : 'http://localhost:5000/api/admin/owner/moderate/post';
        const payload = type === 'user' ? { userId: id, status } : { postId: id, status };

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert(`${type} status updated successfully`);
        } else {
            const data = await res.json();
            alert(`Error: ${data.message}`);
        }
    } catch (err) { alert('Moderation call failed'); }
}
