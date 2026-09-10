import re,json,pathlib,os,shutil
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parents[1]
output=root/'tests'/'out'
output.mkdir(exist_ok=True)
html=(root/'index.html').read_text()
html=html.replace('<script src="src/bootstrap.js"></script>','')
html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+(root/'style.css').read_text()+'</style>')
html=re.sub(r'<link rel="icon"[^>]+>','',html)
# Real UI and input source, with imported rule/data code inlined. No renderer is
# present; the lone projection helper is a deliberate test double.
code='''const T={Vector3:class{set(x,y,z){this.x=x;this.y=y;this.z=z;return this;} project(){this.x=this.y=this.z=0;return this;}}};\n'''
for f in ['rules.js','data.js','ui.js','input.js']:
 text=(root/'src'/f).read_text();text=re.sub(r'^import .*?;\n','',text,flags=re.M);text=re.sub(r'\bexport\s+','',text);code+=text+'\n'
code+='''
window.calls=[];
window.g={mode:'title',profile:freshProfile(),stat:stats(freshProfile()),zone:0,cleared:new Set(),enemies:[],shadows:[],armyTime:0,fps:60,interaction:null,
store:{load:()=>null,saveSettings(){},settings:{quality:'high',volume:.42,music:true,shake:true,damageNumbers:true,difficulty:'normal',showFPS:false}},
sound:{play(){},start(){},update(){}},view:{setQuality(q){calls.push('quality:'+q);},renderer:{info:{render:{calls:0,triangles:0}}}},
player:{pos:{x:0,z:12},hp:150,mana:100,stamina:100,potions:3,angle:Math.PI,cooldowns:{},attackTimer:0,hitChain:0,chainTime:0},rng:()=>.5,
world:{gates:[],chests:[]},action(a){calls.push(a);},start(){this.mode='playing';this.ui.play();},save(){},spendAttribute(){},equip(){},sell(){},releaseShadow(){},toTitle(){this.mode='title';this.ui.title();}};
g.ui=new UI(g);g.input=new Input(g,document.getElementById('game'));g.ui.title();
'''
results={'scope':'Actual HTML/CSS, UI and Input with a stubbed game interface; no Three.js rendering','checks':[]}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_BIN') or shutil.which('chromium') or None,headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':900})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html);page.add_script_tag(content=code)
 page.locator('#start-btn').click();assert page.evaluate('g.mode')=='playing';results['checks'].append('Main menu starts the hunt and reveals HUD')
 page.keyboard.down('w');assert page.evaluate('g.input.movement().z')==-1;page.keyboard.up('w');results['checks'].append('W key maps to camera-relative forward movement')
 page.keyboard.press('q');assert page.evaluate("calls.includes('rift')");results['checks'].append('Q key dispatches Rift Cleave')
 page.keyboard.press('Tab');assert page.locator('#modal').is_visible();assert page.evaluate('g.ui.kind')=='inventory';results['checks'].append('Tab opens the real hunter record')
 page.keyboard.press('Escape');assert not page.locator('#modal').is_visible();results['checks'].append('Escape dismisses the hunter record')
 page.keyboard.press('Escape');assert page.evaluate('g.ui.kind')=='pause';page.locator('#pause-settings').click();page.locator('#quality-setting').select_option('medium');assert page.evaluate("calls.includes('quality:medium')");results['checks'].append('Pause/settings updates the graphics selection')
 page.locator('#settings-close').click()
 page.evaluate("g.ui.chooseBoon(BOONS.slice(0,3),id=>calls.push('boon:'+id))")
 page.keyboard.press('Escape');assert page.locator('#modal').is_visible();page.locator('[data-boon="fury"]').click();assert page.evaluate("calls.includes('boon:fury')");assert not page.locator('#modal').is_visible();results['checks'].append('Reward modal cannot be skipped and applies its selected blessing')
 page.evaluate('g.ui.help()');assert page.locator('#help-close').is_visible();page.locator('#help-close').click();results['checks'].append('Controls dialog opens and closes')
 page.mouse.move(740,400);page.mouse.down(button='right');page.mouse.move(840,420);page.mouse.up(button='right');assert page.evaluate('Math.abs(g.input.yaw)')>.1;results['checks'].append('Right-button orbit changes camera yaw')
 page.evaluate('g.ui.title()');page.screenshot(path=str(output/'title-ui-without-3d.png'))
 # Landscape touch layout. No fake dungeon screenshot is included in the deliverable.
 page.set_viewport_size({'width':844,'height':390});page.evaluate("document.body.classList.add('pointer-touch');g.start();")
 page.locator('[data-action="army"]').click();assert page.evaluate("calls.includes('army')");results['checks'].append('Touch skill buttons dispatch their actions')
 rect=page.locator('#joystick').bounding_box();x=rect['x']+rect['width']/2;y=rect['y']+rect['height']/2
 page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+25,y-20);assert page.evaluate('g.input.movement().x')>.1;page.mouse.up();assert page.evaluate('Math.hypot(g.input.touch.x,g.input.touch.z)')==0;results['checks'].append('Joystick drag moves and release resets its input')
 page.evaluate('g.ui.tick(.1)');page.screenshot(path=str(output/'mobile-ui-without-3d.png'))
 page.evaluate('g.ui.inventory()');box=page.locator('.modal-panel').bounding_box();assert box['x']>=0 and box['x']+box['width']<=845;results['checks'].append('Landscape-phone record panel fits viewport width')
 results['javascriptErrors']=errors;results['ok']=not errors
 print(json.dumps(results,indent=2));(root/'tests'/'ui-results.json').write_text(json.dumps(results,indent=2));browser.close()
