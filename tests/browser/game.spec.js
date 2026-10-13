import { test, expect } from '@playwright/test';

test('two browsers see the 3D world, join a private room, carry one heart, and pause together',async({browser,page},testInfo)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>localStorage.setItem('ddh-quality','low'));
  await page.goto('/');await expect(page.getByRole('heading',{name:'A little teamwork. A lot of heart.'})).toBeVisible();
  await expect(page.locator('#world')).toBeVisible();await expect(page.locator('.fatal')).toHaveCount(0);
  await page.screenshot({path:`artifacts/${testInfo.project.name}-menu.png`});
  await page.getByRole('button',{name:'Start your story'}).click();await page.getByLabel('YOUR NAME',{exact:true}).fill('Test Oliver');
  await page.locator('.story-details summary').click();await page.getByLabel('A NOTE FOR YOUR PERSON').fill('We can carry this together.');
  await page.getByRole('button',{name:'Create our room'}).click();await expect(page.locator('#room-code')).toBeVisible();
  const code=await page.locator('#room-code').innerText();
  const device=testInfo.project.use;
  const partnerBrowser=testInfo.project.name==='chromium'?await browser.browserType().launch({channel:'chromium',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']}):null;
  const context=await (partnerBrowser||browser).newContext({baseURL:device.baseURL||process.env.GAME_URL||'http://127.0.0.1:3000',viewport:device.viewport,isMobile:device.isMobile,hasTouch:device.hasTouch,userAgent:device.userAgent});
  await context.addInitScript(()=>localStorage.setItem('ddh-quality','low'));
  const partner=await context.newPage();partner.on('pageerror',error=>errors.push(error.message));
  await partner.goto(`/?room=${code}`);await partner.getByLabel('YOUR NAME',{exact:true}).fill('Test Juniper');
  await partner.getByRole('button',{name:'Join our adventure'}).click();
  await expect(page.getByRole('heading',{name:'The dream team.'})).toBeVisible();await expect(partner.getByRole('heading',{name:'The dream team.'})).toBeVisible();
  await page.getByRole('button',{name:"I'm ready. Let's do this."}).click();await partner.getByRole('button',{name:"I'm ready. Let's do this."}).click();
  await expect(page.locator('#health-text')).toBeVisible({timeout:20000});await expect(partner.locator('#health-text')).toBeVisible();
  await expect(page.locator('#world')).toHaveAttribute('data-camera-finite','true');
  await expect(page.locator('#world')).toHaveAttribute('data-rendered-view','game');
  await expect.poll(async()=>Number(await page.locator('#world').getAttribute('data-visible-triangles'))).toBeGreaterThan(100);
  const progressBefore=parseFloat(await page.locator('#progress-fill').evaluate(el=>el.style.width));
  await page.keyboard.down('Shift');await partner.keyboard.down('Shift');await page.keyboard.down('w');await partner.keyboard.down('w');
  await expect.poll(async()=>parseFloat(await page.locator('#progress-fill').evaluate(el=>el.style.width)),{timeout:20000}).toBeGreaterThan(progressBefore+1);
  await page.keyboard.up('w');await partner.keyboard.up('w');await page.keyboard.up('Shift');await partner.keyboard.up('Shift');
  await expect(page.locator('#health-text')).toHaveText('100%');await expect(partner.locator('#health-text')).toHaveText('100%');
  await expect.poll(async()=>Number(await page.locator('#world').getAttribute('data-visible-triangles'))).toBeGreaterThan(100);
  await page.screenshot({path:`artifacts/${testInfo.project.name}-playing.png`});
  if(testInfo.project.name==='mobile-webkit'){
    await expect(page.locator('#joystick')).toBeVisible();
    await expect(page.locator('[data-touch="balance"]')).toBeVisible();
    const grab=await page.locator('[data-touch="grab"]').boundingBox();await page.touchscreen.tap(grab.x+grab.width/2,grab.y+grab.height/2);
    await expect(page.locator('#objective')).toContainText('grab your handle');await page.touchscreen.tap(grab.x+grab.width/2,grab.y+grab.height/2);
    await expect(page.locator('#objective')).not.toContainText('grab your handle');
    const joystick=await page.locator('#joystick').boundingBox();
    const touchProgress=parseFloat(await page.locator('#progress-fill').evaluate(el=>el.style.width));
    await page.mouse.move(joystick.x+joystick.width/2,joystick.y+joystick.height/2);await page.mouse.down();
    await page.mouse.move(joystick.x+joystick.width/2,joystick.y+joystick.height/2-35);
    await expect.poll(async()=>parseFloat(await page.locator('#progress-fill').evaluate(el=>el.style.width)),{timeout:6000}).toBeGreaterThan(touchProgress+.15);
    const jump=await page.locator('[data-touch="jump"]').boundingBox();await page.touchscreen.tap(jump.x+jump.width/2,jump.y+jump.height/2);
    // The second pointer must not reset the joystick's independently captured pointer.
    await expect(page.locator('.joystick-knob')).not.toHaveAttribute('style','');await page.mouse.up();
    await expect.poll(async()=>page.locator('.joystick-knob').evaluate(el=>el.style.transform)).toBe('');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.getByRole('button',{name:'Pause adventure'}).click();await expect(partner.getByRole('heading',{name:'Love can wait.'})).toBeVisible();
  await partner.getByRole('button',{name:'Back to us'}).click();await expect(page.getByRole('heading',{name:'Love can wait.'})).toHaveCount(0);
  await context.close();await partnerBrowser?.close();await expect(page.getByRole('heading',{name:'Waiting for your person.'})).toBeVisible();
  expect(errors).toEqual([]);
});

test('settings, character customization and help work without a room',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('ddh-quality','low'));await page.goto('/');
  await page.getByRole('button',{name:'Sound & graphics'}).click();await page.getByLabel('GRAPHICS',{exact:true}).selectOption('low');
  await page.getByRole('button',{name:'Got it'}).click();await page.getByRole('button',{name:'Start your story'}).click();
  await page.getByRole('button',{name:'Juniper The brave one'}).click();await page.getByRole('button',{name:'Lavender color'}).click();
  await expect(page.locator('.appearance.selected')).toContainText('Juniper');await expect(page.locator('.color-swatch.selected')).toHaveAttribute('data-value','#a994dc');
  await page.getByRole('button',{name:'How to play',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Two real players are needed');
  await page.getByRole('button',{name:'Got it'}).click();expect(errors).toEqual([]);
});
