import re
from typing import Annotated
from pydantic import AfterValidator

# Regex to match control characters except newline and carriage return
_CONTROL_CHARS_RE = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]')

def strip_control_chars(v: str) -> str:
    if not isinstance(v, str):
        return v
    return _CONTROL_CHARS_RE.sub('', v)

# Use SafeStr as a drop-in replacement for str in Pydantic schemas where we want to strip control chars automatically
SafeStr = Annotated[str, AfterValidator(strip_control_chars)]
