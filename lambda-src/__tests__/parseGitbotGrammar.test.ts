import {parseGitbotArgs} from "../ts-src/parseSlashCommand";


test(`no args`, () => {
  const userInput = '';
  const gitbotOptions = parseGitbotArgs(userInput);
  expect(gitbotOptions.projectIdentifier).toBeUndefined();
  expect(gitbotOptions.help).toBeTruthy();
  expect(gitbotOptions.projectHelp).toBeUndefined();
  expect(gitbotOptions.login).toBeUndefined();
  expect(gitbotOptions.status).toBeUndefined();
});

test(`?`, () => {
  const userInput = '?';
  const gitbotOptions = parseGitbotArgs(userInput);
  expect(gitbotOptions.projectIdentifier).toBeUndefined();
  expect(gitbotOptions.help).toBeTruthy();
  expect(gitbotOptions.projectHelp).toBeUndefined();
  expect(gitbotOptions.login).toBeUndefined();
  expect(gitbotOptions.status).toBeUndefined();
});

test(`help`, () => {
  const userInput = 'help';
  const gitbotOptions = parseGitbotArgs(userInput);
  expect(gitbotOptions.projectIdentifier).toBeUndefined();
  expect(gitbotOptions.help).toBeTruthy();
  expect(gitbotOptions.projectHelp).toBeUndefined();
  expect(gitbotOptions.login).toBeUndefined();
  expect(gitbotOptions.status).toBeUndefined();
});

test(`login`, () => {
  const userInput = 'login';
  const gitbotOptions = parseGitbotArgs(userInput);
  expect(gitbotOptions.projectIdentifier).toBeUndefined();
  expect(gitbotOptions.help).toBeUndefined();
  expect(gitbotOptions.projectHelp).toBeUndefined();
  expect(gitbotOptions.login).toBeTruthy();
  expect(gitbotOptions.status).toBeUndefined();
});

test(`project ?`, () => {
  const userInput = 'project ?';
  const gitbotOptions = parseGitbotArgs(userInput);
  expect(gitbotOptions.projectIdentifier).toBeUndefined();
  expect(gitbotOptions.help).toBeUndefined();
  expect(gitbotOptions.projectHelp).toBeTruthy();
  expect(gitbotOptions.login).toBeUndefined();
  expect(gitbotOptions.status).toBeUndefined();
});

test(`project help`, () => {
  const userInput = 'project help';
  const gitbotOptions = parseGitbotArgs(userInput);
  expect(gitbotOptions.projectIdentifier).toBeUndefined();
  expect(gitbotOptions.help).toBeUndefined();
  expect(gitbotOptions.projectHelp).toBeTruthy();
  expect(gitbotOptions.login).toBeUndefined();
  expect(gitbotOptions.status).toBeUndefined();
});

test(`project "quoted identifier" connect`, () => {
  const userInput = 'project "quoted identifier" connect';
  const gitbotOptions = parseGitbotArgs(userInput);
  expect(gitbotOptions.projectIdentifier).toEqual('quoted identifier');
  expect(gitbotOptions.help).toBeUndefined();
  expect(gitbotOptions.projectHelp).toBeUndefined();
  expect(gitbotOptions.login).toBeUndefined();
  expect(gitbotOptions.status).toBeUndefined();
});

test(`project unquoted_identifier connect`, () => {
  const userInput = 'project unquoted_identifier connect';
  const gitbotOptions = parseGitbotArgs(userInput);
  expect(gitbotOptions.projectIdentifier).toEqual('unquoted_identifier');
  expect(gitbotOptions.help).toBeUndefined();
  expect(gitbotOptions.projectHelp).toBeUndefined();
  expect(gitbotOptions.login).toBeUndefined();
  expect(gitbotOptions.status).toBeUndefined();
});

test(`status`, () => {
  const userInput = 'status';
  const gitbotOptions = parseGitbotArgs(userInput);
  expect(gitbotOptions.projectIdentifier).toBeUndefined();
  expect(gitbotOptions.help).toBeUndefined();
  expect(gitbotOptions.projectHelp).toBeUndefined();
  expect(gitbotOptions.login).toBeUndefined();
  expect(gitbotOptions.status).toBeTruthy();
});