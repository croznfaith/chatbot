export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { token, chatId, message } = req.body;
        
        if (!token || !chatId || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Send message via Telegram API
        const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            })
        });
        
        const data = await telegramResponse.json();
        
        if (data.ok) {
            return res.status(200).json({ 
                success: true, 
                message_id: data.result.message_id 
            });
        } else {
            return res.status(400).json({ 
                error: data.description || 'Failed to send message' 
            });
        }
        
    } catch (error) {
        console.error('Bot API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
