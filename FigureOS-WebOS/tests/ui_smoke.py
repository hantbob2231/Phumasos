from pathlib import Path
from urllib.parse import urlparse
import json, mimetypes
from playwright.sync_api import sync_playwright
ROOT=Path('/mnt/data/FigureOS-WebOS')

def local_file(path):
    if path=='/': return ROOT/'index.html'
    if path in ['/figure','/figure/']: return ROOT/'figure/index.html'
    if path=='/manifest.webmanifest': return ROOT/'public/manifest.webmanifest'
    if path=='/sw.js': return ROOT/'public/sw.js'
    if path=='/offline.html': return ROOT/'public/offline.html'
    if path.startswith('/src/'): return ROOT/path.lstrip('/')
    if path.startswith('/figure/'): return ROOT/path.lstrip('/')
    if path.startswith('/icons/'): return ROOT/'public'/path.lstrip('/')
    return None

def mime(path):
    return {'.js':'text/javascript','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.png':'image/png','.mp3':'audio/mpeg','.mp4':'video/mp4'}.get(path.suffix,mimetypes.guess_type(str(path))[0] or 'application/octet-stream')

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1440,'height':900},service_workers='block')
    page=context.new_page(); errors=[]
    page.on('pageerror',lambda err: errors.append(str(err)))
    page.on('console',lambda msg: errors.append(msg.text) if msg.type=='error' and 'Failed to load resource' not in msg.text else None)
    def route_handler(route):
        u=urlparse(route.request.url)
        if u.hostname!='figure.test': return route.abort()
        if u.path=='/api/config': return route.fulfill(status=200,content_type='application/json',body=json.dumps({'proxyEnabled':False,'browserSearchTemplate':''}))
        if u.path=='/api/csrf': return route.fulfill(status=200,content_type='application/json',body=json.dumps({'token':'test-token'}),headers={'set-cookie':'figure_csrf=test-token; Path=/; HttpOnly; SameSite=Strict'})
        if u.path=='/api/assistant': return route.fulfill(status=501,content_type='application/json',body=json.dumps({'message':'No external assistant provider is configured.'}))
        f=local_file(u.path)
        if f and f.is_file(): return route.fulfill(status=200,content_type=mime(f),body=f.read_bytes())
        return route.fulfill(status=404,body='not found')
    page.route('**/*',route_handler)
    page.goto('https://figure.test/',wait_until='domcontentloaded')
    page.wait_for_selector('#home-view.active'); assert page.locator('#home-greeting').is_visible()
    page.click('#os-dock [data-route="browser"]'); page.wait_for_selector('#browser-view.active')
    initial=page.locator('.browser-tab').count(); page.click('#new-tab-button'); assert page.locator('.browser-tab').count()==initial+1
    page.click('#browser-menu-button'); page.click('[data-browser-action="duplicate"]'); assert page.locator('.browser-tab').count()==initial+2
    page.click('#os-dock [data-route="figure"]'); page.wait_for_selector('#figure-view.active')
    page.click('#os-dock [data-route="library"]'); page.wait_for_selector('.library-card',timeout=7000); cards=page.locator('.library-card').count(); assert cards>10
    page.click('#global-search-trigger'); page.fill('#global-search-input','Cyberpunk'); page.wait_for_selector('.search-result'); assert 'Cyberpunk' in page.locator('.search-results').inner_text(); page.keyboard.press('Escape')
    page.click('#os-dock [data-route="settings"]'); page.click('[data-theme="neon"]'); assert page.evaluate("localStorage.getItem('figure_theme')")=='neon'
    page.set_viewport_size({'width':390,'height':844}); page.wait_for_timeout(200); box=page.locator('#os-dock').bounding_box(); assert box and box['y']>760 and box['width']>360
    if errors: raise AssertionError('console/page errors: '+repr(errors[:10]))
    print(json.dumps({'ui_smoke':'passed','library_cards':cards,'console_errors':0,'mobile_nav':'verified'}))
    browser.close()
