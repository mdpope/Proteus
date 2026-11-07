import test from 'node:test';
import assert from 'node:assert/strict';
import {render} from '../src/shared/markdown-renderer.js';
import {parser} from '../src/shared/markdown-parser.js';
test('properties preserve scalars and lists without executing markup or expanding aliases',()=>{
 const html=render('---\ntitle: "<img src=x onerror=evil()>"\ntags: [one, two]\ndone: true\n---\n# Body');
 assert.match(html,/<summary>Properties/);assert.match(html,/one, two/);assert.match(html,/&lt;img/);assert.match(html,/<h1>Body/);assert.doesNotMatch(html,/<img src=x/);
 assert.doesNotMatch(render('---\nx: &x [a]\ny: *x\n---'),/class="md-properties"/);
 assert.doesNotMatch(render('---\nx: 1\nx: 2\n---'),/class="md-properties"/);
});
test('wiki links participate in the shared reference parser and skip code/external schemes',()=>{
 const tokens=parser().parse('[[Folder/My note#Heading|Label]] and `[[Code]]` and [[javascript:alert]]',{});
 const links=tokens.flatMap(t=>t.children||[]).filter(t=>t.type==='link_open');
 assert.equal(links.length,1);assert.equal(links[0].attrGet('href'),'Folder/My%20note.md#Heading');
 assert.match(render('[[Note]]'),/data-link="Note.md"/);
 assert.match(render('```\n[[Code]]\n```'),/\[\[Code\]\]/);
});
