export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const update = req.body;
        console.log('Webhook received:', JSON.stringify(update, null, 2));
        
        // Extract token from query or body
        const token = req.query.token || update.token;
        
        if (!token) {
            return res.status(400).json({ error: 'Bot token required' });
        }
        
        // Handle different update types
        if (update.message) {
            const message = update.message;
            const chatId = message.chat.id;
            const userId = message.from.id;
            const userName = message.from.first_name || message.from.username || `User ${userId}`;
            const text = message.text || '(Media message)';
            
            // Store chat info (in production, use database)
            const chatInfo = {
                id: chatId,
                userId: userId,
                name: userName,
                lastMessage: text,
                timestamp: new Date().toISOString(),
                unread: 1
            };
            
            // Here you would save to database
            // For demo, we'll just log it
            console.log('New message from:', chatInfo);
            
            // Auto-reply (optional)
            if (text.toLowerCase().includes('hello') || text.toLowerCase().includes('hi')) {
                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: `Hello ${userName}! 👋\nI received your message: "${text}"`,
                        parse_mode: 'HTML'
                    })
                });
            }
        }
        
        return res.status(200).json({ ok: true });
        
    } catch (error) {
        console.error('Webhook error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
