import rules from './rules';
import { Context } from 'koa';

export interface configInterface {roles?: string[], rules?: {[index: string]: (ctx: Context, next: () => Promise<any>) => any}, strategies?: {[index: string]: {[index: string]: string}}, superUsersRoles?: string[]}



const config : configInterface = {
  roles: ['admin', 'manager', 'user'],
  superUsersRoles: ['admin'],
  rules: {
    // will be loaded later in function
  },
  strategies: {
    'readonly': {
      'get': 'allowAll',
      'post': 'denyAll',
      'delete': 'denyAll',
      'patch': 'denyAll'
    },
    'loggedIn': {
      'get': 'allowOwn',
      'post': 'allowOwn',
      'delete': 'allowOwn',
      'patch': 'allowOwn'
    },
    'user': {
      'get': 'allowOwnUser',
      'post': 'allowAll',
      'delete': 'denyAll',
      'patch': 'allowOwnUser'
    }
  }
}

function loadAllRules(config: configInterface){
  for(let func in rules.rules){
    config.rules[func] = rules.rules[func];
  }
}

loadAllRules(config);

export default config;