#!/usr/bin/env python3
"""Decode bounded RFC822 evidence locally; never fetch or render external content."""
import email,email.policy,sys,json,base64
from pathlib import Path
from html.parser import HTMLParser
class Plain(HTMLParser):
 def __init__(self): super().__init__(); self.parts=[]; self.skip=0
 def handle_starttag(self,t,a):
  if t in ('script','style'): self.skip+=1
 def handle_endtag(self,t):
  if t in ('script','style'): self.skip=max(0,self.skip-1)
 def handle_data(self,s):
  if not self.skip: self.parts.append(s)
raw=Path(sys.argv[1]).read_bytes()
if len(raw)>25*1024*1024: raise ValueError('Message exceeds 25 MB')
message=email.message_from_bytes(raw,policy=email.policy.default)
body=message.get_body(preferencelist=('plain','html'))
text=body.get_content() if body else ''
if body and body.get_content_type()=='text/html':
 parser=Plain(); parser.feed(text); text=' '.join(parser.parts)
attachments=[]; total=0
for part in message.walk():
 if part.get_content_maintype()=='multipart': continue
 mime=part.get_content_type()
 if mime not in ('application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif'): continue
 content=part.get_payload(decode=True) or b''; total+=len(content)
 if len(attachments)>=12 or total>25*1024*1024: raise ValueError('Too many or oversized attachments')
 attachments.append({'name':str(part.get_filename() or 'email-attachment')[:200],'mime':mime,'content':base64.b64encode(content).decode()})
print(json.dumps({'subject':str(message.get('Subject','Receipt email'))[:200],'from':str(message.get('From',''))[:500],'date':str(message.get('Date',''))[:200],'text':str(text)[:18000],'attachments':attachments}))
