import re
from fastapi import HTTPException

# Common severe slurs, profanities, and harassment keywords to filter in real-name campus chat
BANNED_WORDS = {
    "slur1", "slur2", "fck", "fuck", "fucker", "fucking", "shit", "bitch", 
    "asshole", "bastard", "cunt", "dick", "pussy", "nigger", "faggot", 
    "retard", "whore", "slut", "kill yourself", "kys", "rape"
}

# Compile word boundary regex for fast matching
_BANNED_REGEX = re.compile(
    r'\b(' + '|'.join(re.escape(w) for w in sorted(BANNED_WORDS, key=len, reverse=True)) + r')\b',
    re.IGNORECASE
)

# Spam pattern: single character repeated more than 20 times (e.g. "aaaaaaaaaaaaaaaaaaaaa")
_SPAM_REPEAT_REGEX = re.compile(r'(.)\1{20,}', re.IGNORECASE)

# Spam pattern: more than 4 URLs in a single message
_URL_REGEX = re.compile(r'https?://[^\s]+', re.IGNORECASE)


def check_chat_message_content(text: str) -> None:
    """
    Lightweight moderation hook for chat messages.
    Raises HTTPException 400 if text contains severe profanity/slurs or spam patterns.
    """
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Message content cannot be empty.")
        
    cleaned = text.strip()
    
    # 1. Profanity / hate speech / harassment check
    if _BANNED_REGEX.search(cleaned):
        raise HTTPException(
            status_code=400,
            detail="Message violates campus moderation policy (inappropriate language or harassment)."
        )
        
    # 2. Repeated character spam check
    if _SPAM_REPEAT_REGEX.search(cleaned):
        raise HTTPException(
            status_code=400,
            detail="Message rejected as spam (excessive repeated characters)."
        )
        
    # 3. Excessive links / phishing spam check
    urls = _URL_REGEX.findall(cleaned)
    if len(urls) > 4:
        raise HTTPException(
            status_code=400,
            detail="Message rejected as spam (excessive URLs)."
        )
