// Global variables
let botToken = '';
let activeChat = null;
let allChats = [];
let webhookUrl = '';

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadSavedToken();
    setWebhookUrl();
    startPolling();
});

// Load saved bot token from localStorage
function loadSavedToken() {
    const savedToken = localStorage.getItem('telegram_bot_token');
    if (savedToken) {
        document.getElementById('botToken').value = savedToken;
        botToken = savedToken;
        updateBotStatus(true);
        setupWebhook();
        loadChats();
    }
}

// Save bot token
function saveBotToken() {
    const tokenInput = document.getElementById('botToken');
    const token = tokenInput.value.trim();
    
    if (!token) {
        alert('Please enter your bot token');
        return;
    }
    
    // Test the token
    testBotToken(token).then(isValid => {
        if (isValid) {
            botToken = token;
            localStorage.setItem('telegram_bot_token', token);
            updateBotStatus(true);
            setupWebhook();
            loadChats();
            showModal('Bot connected successfully!');
        } else {
            alert('Invalid bot token. Please check and try again.');
        }
    });
}

// Test if bot token is valid
async function testBotToken(token) {
    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        const data = await response.json();
        return data.ok === true;
    } catch (error) {
        console.error('Token test failed:', error);
        return false;
    }
}

// Set webhook URL
function setWebhookUrl() {
    const baseUrl = window.location.origin;
    webhookUrl = `${baseUrl}/api/webhook?token=${botToken || 'YOUR_TOKEN'}`;
    document.getElementById('webhookUrl').textContent = webhookUrl;
}

// Setup webhook with Telegram
async function setupWebhook() {
    if (!botToken) return;
    
    try {
        const baseUrl = window.location.origin;
        const webhookUrl = `${baseUrl}/api/webhook?token=${botToken}`;
        
        const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: webhookUrl
            })
        });
        
        const data = await response.json();
        console.log('Webhook setup:', data);
    } catch (error) {
        console.error('Webhook setup error:', error);
    }
}

// Update bot status UI
function updateBotStatus(isOnline) {
    const statusElement = document.getElementById('botStatus');
    const indicator = statusElement.querySelector('.status-indicator');
    const text = statusElement.querySelector('span');
    
    if (isOnline) {
        indicator.className = 'status-indicator online';
        text.textContent = 'Bot Online';
        statusElement.style.color = '#4CAF50';
    } else {
        indicator.className = 'status-indicator offline';
        text.textContent = 'Bot Offline';
        statusElement.style.color = '#ff4444';
    }
}

// Load chats from "database" (localStorage)
function loadChats() {
    if (!botToken) {
        showMessage('Please enter bot token first');
        return;
    }
    
    // In production, this would fetch from your API
    // For demo, we'll use localStorage
    const savedChats = JSON.parse(localStorage.getItem('telegram_chats') || '[]');
    allChats = savedChats;
    renderChatList(savedChats);
}

// Render chat list
function renderChatList(chats) {
    const container = document.getElementById('chatsContainer');
    const chatCount = document.getElementById('chatCount');
    
    chatCount.textContent = `(${chats.length})`;
    
    if (chats.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments"></i>
                <p>No chats yet</p>
                <small>Send a message to your bot to start chatting</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = chats.map(chat => `
        <div class="chat-item ${activeChat?.id === chat.id ? 'active' : ''}" 
             onclick="selectChat(${JSON.stringify(chat).replace(/"/g, '&quot;')})">
            <div class="chat-avatar">
                <i class="fas fa-user-circle"></i>
            </div>
            <div class="chat-info">
                <div class="chat-name">${chat.name || `User ${chat.id}`}</div>
                <div class="chat-last-message">${chat.lastMessage || 'No messages yet'}</div>
            </div>
            <div class="chat-time">${formatTime(chat.timestamp)}</div>
            ${chat.unread ? `<div class="chat-unread">${chat.unread}</div>` : ''}
        </div>
    `).join('');
}

// Select a chat
function selectChat(chat) {
    activeChat = chat;
    
    // Update UI
    document.getElementById('chatPlaceholder').style.display = 'none';
    document.getElementById('chatActive').style.display = 'flex';
    
    // Update chat header
    document.getElementById('activeChatName').textContent = chat.name || `User ${chat.id}`;
    document.getElementById('activeChatId').textContent = `ID: ${chat.id}`;
    
    // Load messages for this chat
    loadMessages(chat.id);
    
    // Update chat list active state
    renderChatList(allChats);
}

// Load messages for a chat
function loadMessages(chatId) {
    const messages = JSON.parse(localStorage.getItem(`chat_${chatId}_messages`) || '[]');
    const messagesList = document.getElementById('messagesList');
    
    messagesList.innerHTML = messages.map(msg => `
        <div class="message ${msg.sender === 'bot' ? 'received' : 'sent'}">
            <div class="message-content">${msg.text}</div>
            <div class="message-time">${formatTime(msg.timestamp)}</div>
        </div>
    `).join('');
    
    // Scroll to bottom
    messagesList.scrollTop = messagesList.scrollHeight;
}

// Send message
async function sendMessage() {
    if (!activeChat || !botToken) return;
    
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add to UI immediately
    const messagesList = document.getElementById('messagesList');
    const timestamp = new Date().toISOString();
    
    messagesList.innerHTML += `
        <div class="message sent">
            <div class="message-content">${message}</div>
            <div class="message-time">${formatTime(timestamp)}</div>
        </div>
    `;
    
    // Scroll to bottom
    messagesList.scrollTop = messagesList.scrollHeight;
    
    // Save to localStorage
    saveMessage(activeChat.id, {
        text: message,
        sender: 'you',
        timestamp: timestamp
    });
    
    // Send to Telegram
    try {
        const response = await fetch('/api/bot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: botToken,
                chatId: activeChat.id,
                message: message
            })
        });
        
        const data = await response.json();
        console.log('Message sent:', data);
    } catch (error) {
        console.error('Send message error:', error);
    }
    
    // Clear input
    input.value = '';
    input.focus();
}

// Save message to localStorage
function saveMessage(chatId, message) {
    const key = `chat_${chatId}_messages`;
    const messages = JSON.parse(localStorage.getItem(key) || '[]');
    messages.push(message);
    localStorage.setItem(key, JSON.stringify(messages));
}

// Handle Enter key
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Filter chats
function filterChats() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allChats.filter(chat => 
        chat.name.toLowerCase().includes(searchTerm) || 
        chat.lastMessage?.toLowerCase().includes(searchTerm)
    );
    renderChatList(filtered);
}

// Format time
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 86400000) { // Less than 1 day
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 604800000) { // Less than 1 week
        return date.toLocaleDateString([], { weekday: 'short' });
    } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
}

// Copy webhook URL
function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl)
        .then(() => showMessage('Webhook URL copied!'))
        .catch(err => console.error('Copy failed:', err));
}

// Copy bot link
function copyBotLink() {
    // This would need actual bot username
    showMessage('Bot link copied!');
}

// Show modal
function showModal(message) {
    const modal = document.getElementById('tokenModal');
    modal.style.display = 'flex';
}

// Close modal
function closeModal() {
    document.getElementById('tokenModal').style.display = 'none';
}

// Show temporary message
function showMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'notification';
    messageDiv.textContent = text;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 1000;
        animation: slideIn 0.3s;
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s';
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}

// Poll for new messages (simulated - in production use webhook)
function startPolling() {
    setInterval(() => {
        if (!botToken) return;
        
        // Simulate new messages
        const shouldAddMessage = Math.random() > 0.8;
        if (shouldAddMessage && allChats.length > 0) {
            const randomChat = allChats[Math.floor(Math.random() * allChats.length)];
            const messages = [
                "Hello! 👋",
                "How are you?",
                "Can you help me?",
                "Test message",
                "Nice bot!",
                "What can you do?"
            ];
            
            const newMessage = {
                text: messages[Math.floor(Math.random() * messages.length)],
                sender: 'user',
                timestamp: new Date().toISOString()
            };
            
            saveMessage(randomChat.id, newMessage);
            
            // Update last message
            randomChat.lastMessage = newMessage.text;
            randomChat.timestamp = newMessage.timestamp;
            randomChat.unread = (randomChat.unread || 0) + 1;
            
            localStorage.setItem('telegram_chats', JSON.stringify(allChats));
            
            if (activeChat?.id === randomChat.id) {
                loadMessages(randomChat.id);
            }
            
            renderChatList(allChats);
        }
    }, 5000);
}

// Add some sample chats on first load
if (!localStorage.getItem('telegram_chats')) {
    const sampleChats = [
        {
            id: 123456789,
            name: "John Doe",
            lastMessage: "Hello, how are you?",
            timestamp: new Date().toISOString(),
            unread: 2
        },
        {
            id: 987654321,
            name: "Alice Smith",
            lastMessage: "Thanks for the help!",
            timestamp: new Date(Date.now() - 3600000).toISOString()
        },
        {
            id: 456789123,
            name: "Bob Johnson",
            lastMessage: "Can you send me the file?",
            timestamp: new Date(Date.now() - 86400000).toISOString()
        }
    ];
    
    localStorage.setItem('telegram_chats', JSON.stringify(sampleChats));
    
    // Add sample messages
    sampleChats.forEach(chat => {
        const messages = [
            { text: "Hello there!", sender: 'user', timestamp: new Date(Date.now() - 7200000).toISOString() },
            { text: "Hi! How can I help you?", sender: 'bot', timestamp: new Date(Date.now() - 3600000).toISOString() },
            { text: chat.lastMessage, sender: 'user', timestamp: chat.timestamp }
        ];
        localStorage.setItem(`chat_${chat.id}_messages`, JSON.stringify(messages));
    });
}
