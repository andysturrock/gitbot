/* eslint-disable @typescript-eslint/no-unsafe-call */
import {IterationNode, NonterminalNode, TerminalNode} from 'ohm-js';
import grammar, {GitbotArgsActionDict, GitbotArgsSemantics} from './gitbotGrammar.ohm-bundle';

export interface GitbotOptions {
  /**
   * The project id or name
   */
  projectIdentifier?: string,
  help?: boolean,
  projectHelp?: boolean
  login?: boolean
}

/**
 * Parses userInput into a {@link GitbotOptions} object.
 * @param userInput The string to parse.
 * @returns A {@link GitbotOptions} object with name, startDate and endDate populated.
 * @throws {Error} on invalid userInput.
 * @see {@link gitbotGrammar.ohm} for grammar.
 */
export function parseGitbotArgs(userInput: string): GitbotOptions {
  const gitBotOptions: GitbotOptions = {
    projectIdentifier: undefined,
    help: undefined,
    projectHelp: undefined
  };

  const actions: GitbotArgsActionDict<GitbotOptions> = {

    EmptyExp(this: NonterminalNode, arg0: NonterminalNode) {
      arg0.eval();
      gitBotOptions.help = true;
      return gitBotOptions;
    },
    HelpExp(this: NonterminalNode, arg0: TerminalNode) {
      arg0.eval();
      gitBotOptions.help = true;
      return gitBotOptions;
    },
    LoginExp(this: NonterminalNode, arg0: TerminalNode) {
      arg0.eval();
      gitBotOptions.login = true;
      return gitBotOptions;
    },
    ProjectHelpExp(this: NonterminalNode, arg0: NonterminalNode) {
      arg0.eval();
      gitBotOptions.help = undefined;
      gitBotOptions.projectHelp = true;
      return gitBotOptions;
    },
    ProjectExp(this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) {
      arg0.eval();
      arg1.eval();
      return gitBotOptions;
    },
    ProjectConnectExp(this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode) {
      arg0.eval();
      arg1.eval();
      return gitBotOptions;
    },
    ProjectIdentifierExp(this: NonterminalNode, arg0: NonterminalNode) {
      arg0.eval();
      gitBotOptions.projectIdentifier = this.sourceString.replace(/"/g, '');
      return gitBotOptions;
    },
    projectNamePartNoQuote(this: NonterminalNode, arg0: NonterminalNode, arg1: IterationNode) {
      arg0.eval();
      arg1.eval();
      return gitBotOptions;
    },
    projectNamePartQuote(this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: IterationNode, arg3: TerminalNode) {
      arg0.eval();
      arg1.eval();
      arg2.eval();
      arg3.eval();
      return gitBotOptions;
    },
    _terminal(this: TerminalNode) {
      return gitBotOptions;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _iter(...children) {
      return gitBotOptions;
    }
  };

  const semantics: GitbotArgsSemantics = grammar.createSemantics();
  semantics.addOperation<GitbotOptions>('eval', actions);

  const matchResult = grammar.match(userInput);
  const semanticsResult = semantics(matchResult);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const evalResult = semanticsResult.eval();

  return evalResult as GitbotOptions;
}