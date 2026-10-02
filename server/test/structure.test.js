import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'..');
const required=['client/src/App.jsx','client/src/main.jsx','client/vite.config.js','client/src/styles.css','server/src/app.js','server/src/server.js','server/src/routes/auth.routes.js','server/src/controllers/auth.controller.js','server/src/services/auth.service.js','server/src/models/message.js','server/src/middleware/auth.js','database/migrations/001_init.sql','database/migrations/002_social_features.sql','.env.example','client/public/manifest.webmanifest','client/public/sw.js'];

for(const f of required)test(`exists: ${f}`,()=>assert.ok(fs.existsSync(path.join(root,f))));

test('no obvious secret material',()=>{
  const text=fs.readFileSync(path.join(root,'.env.example'),'utf8');
  assert.equal(/BEGIN PRIVATE KEY|AKIA[0-9A-Z]{16}/.test(text),false);
});

test('migration contains core tables',()=>{
  const sql=fs.readFileSync(path.join(root,'database/migrations/001_init.sql'),'utf8');
  for(const t of ['users','sessions','follows','news','comments','groups','group_members','notifications','reports','friend_requests','blocks'])assert.match(sql,new RegExp(`create table if not exists ${t}`,'i'));
});

test('social migration contains social tables and indexes',()=>{
  const sql=fs.readFileSync(path.join(root,'database/migrations/002_social_features.sql'),'utf8');
  for(const t of ['posts','post_likes','post_comments','comment_likes'])assert.match(sql,new RegExp(`create table if not exists ${t}`,'i'));
  for(const i of ['idx_posts_created','idx_post_comments_post_created'])assert.match(sql,new RegExp(`create index if not exists ${i}`,'i'));
});

test('repository has no tracked runtime logs or merge artifacts',()=>{
  const forbidden=['vexora-data.json','server.log','local-server.log','qa-server.log','portable-server.log','restore-server.log','e --continue'];
  for(const f of forbidden)assert.equal(fs.existsSync(path.join(root,f)),false,`forbidden tracked artifact exists: ${f}`);
  const scan=(dir)=>{
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      if(['.git','node_modules','dist','coverage'].includes(entry.name))continue;
      const full=path.join(dir,entry.name);
      if(entry.isDirectory())scan(full);
      else if(/\.(js|jsx|ts|tsx|html|css|json|md|yml|yaml|sql)$/.test(entry.name)){
        const text=fs.readFileSync(full,'utf8');
        assert.equal(/<<<<<<< |>>>>>>> |=======/.test(text),false,`merge marker found in ${path.relative(root,full)}`);
      }
    }
  };
  scan(root);
});

test('production security defaults are enforced in env validation',()=>{
  const text=fs.readFileSync(path.join(root,'server/src/config/env.js'),'utf8');
  assert.match(text,/NODE_ENV/);
  assert.match(text,/COOKIE_SECURE must be true in production/);
});
