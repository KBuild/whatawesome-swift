import fs from 'fs';
import _ from 'lodash';
import got from 'got';
import Promise from 'bluebird';

const text = fs.readFileSync('list.md', 'utf-8');
const linkRegexp = /\[([a-zA-Z0-9\-\_\ \.\+]+)\]\(([a-zA-Z0-9\-\_\/\:\.\%\#\ \+]+)\)/g;

// url picking
const urlList = _
  .chain(text.split("\n"))
  .filter(val => /\s*\* \[/.test(val))
  .filter(val => !val.includes('back to top'))
  .map(val => new RegExp(linkRegexp).exec(val))
  .filter(val => val != null)
  .map(val => [val[1], val[2].replace('https://github.com/','')])
  .value();

console.log(`URL List count : ${urlList.length}`);

// get github access token for avoiding access limit 
const opt = process.env.GITHUB_ACCESS_TOKEN ? {
  username: process.env.GITHUB_USERNAME,
  password: process.env.GITHUB_ACCESS_TOKEN,
} : {};

console.dir(urlList);

// fetch data
Promise
  .map(urlList, (val) => {
    return got(`https://api.github.com/repos/${val[1]}`, opt)
      .then(response => JSON.parse(response.body))
      .catch(err => ({ full_name: val[1], open_issues_count: 0, forks_count: 0, stargazers_count: 0 }));
  }, { concurrency: 5 })
  .map((val) => {
    return {
      repo: val.full_name,
      issues: val.open_issues_count,
      forks: val.forks_count,
      stars: val.stargazers_count,
    }
  })
  .filter(hash => hash.stars > 2000)
  .each((val) => {
    console.log(`${val.repo},${val.stars},${val.issues},${val.forks}`);
  })
  .catch(err => console.error(err));
