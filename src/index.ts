import * as fs from 'fs';
import { Context } from 'koa';
let merge = require('deepmerge');

import Bambus, {Controller, actionsSymbol, routesSymbol, correctFunctionBasedOnName, controllerFunction} from '@bambus/main';

const debug = require('debug')('bambus:plugin:roles');

export const rolesSymbol = Symbol('roles');

import defaultConfig, {configInterface} from './config';

interface strategyDef {strategy: string}
interface ruleDef {rule:string}

type stratOrRule =  strategyDef | ruleDef

declare module '@bambus/main/dist/controller' {
  interface Controller{
    [rolesSymbol]: {
      [index: string]: stratOrRule
    }
  }
}

interface ControllerConstructor{
  new(): Controller
}

interface Hash{
  [key: string]: any
}


export default function(bambus: Bambus, userConfig: configInterface){
  let config = joinConfigs(defaultConfig, userConfig);
  checkConsistencyForConfig(config);

  for(let controller in bambus.controllers){
    // debug(controller);
    let currentController = bambus.controllers[controller];
    debug(controller, currentController);
    debug(currentController.router)
    let needRoles: {[s: string]: stratOrRule} = currentController[rolesSymbol] || {};
    for(let needRole in needRoles){
      let strategyOrRole = needRoles[needRole];
      let ruleToApply = '';
      let [httpMethod, ...rest] = needRole.split(' ');
      if(isstrategyDef(strategyOrRole)){
        ruleToApply = config.strategies[strategyOrRole.strategy][httpMethod];
      }
      else{
        ruleToApply = strategyOrRole.rule;
      }

      
      let toExecute = correctFunctionBasedOnName(currentController.router, httpMethod);
      if(typeof config.rules[ruleToApply] !== 'function'){
        console.error(`ERROR: The Rule "${ruleToApply}" is not a function and can therefor not be applied as a authorization function.`);
        console.error(`ERROR: The Rule was applied to the controller "${currentController.name}Controller".`);
        process.exit(1);
      }
      try{
        toExecute(needRole, rest.join(' '), config.rules[ruleToApply].bind(config));
      }
      catch(e){
        console.error(`ERROR: Could not apply a role authorization function for "${currentController.name}Controller". Rule was ${ruleToApply}. Thrown error:`);
        console.log(e);
        process.exit(1);
      }
    }

  }
}

function checkConsistencyForConfig(config: configInterface){
  // check that every rule in strategy that is in use is also defined in rules
  for(let strat in config.strategies){
    for(let methodCall in config.strategies[strat]){
      let ruleToCall = config.strategies[strat][methodCall];
      if(typeof config.rules[ruleToCall] !== 'function'){
        console.error(`ERROR: The config for the Roles-Plugin is not consistent.`);
        console.error(`ERROR: In the strategy "${strat}" the method "${methodCall}" has a value that can not be found in the config.rules.`);
        process.exit(1);
      }
    }
  }
}

function isstrategyDef(ror: strategyDef | ruleDef): ror is strategyDef {
    return (<strategyDef>ror).strategy !== undefined;
}

function joinConfigs(defaultConfig:configInterface, userConfig:configInterface = {}): configInterface{
  let config = merge(defaultConfig, userConfig);
  config.roles = userConfig.roles || defaultConfig.roles;
  return config;
}

export function strategy(strategy: string){
  return function(constructor: ControllerConstructor) { // this is the decorator
    if(!constructor.prototype[rolesSymbol]){
      constructor.prototype[rolesSymbol] = {}
    }

    for (let name in (constructor.prototype[actionsSymbol] || {})) {
      // debug('obj.path', obj.path);
      if(constructor.prototype[rolesSymbol][name] === undefined){
        constructor.prototype[rolesSymbol][name] = {strategy: strategy};
      }
    }

    for (let name in (constructor.prototype[routesSymbol] || {})) {
      // debug('obj.path', obj.path);
      if(constructor.prototype[rolesSymbol][name] === undefined){
        constructor.prototype[rolesSymbol][name] = {strategy: strategy};
      }
    }
  }
}

export function useRule(rule: string){
  return function (target: Controller, propertyKey: string, descriptor: PropertyDescriptor) { // this is the decorator
    if(!target[rolesSymbol]){
      target[rolesSymbol] = {}
    }
    const obj = findRouteOrAction(target, propertyKey);
    target[rolesSymbol][obj.method + ' ' + obj.path] = {rule};
  }
}


function findRouteOrAction(target: Controller, name: string) {
  let obj = target[actionsSymbol].filter(function(item){
    return item.name === name;
  })[0];
  if(!!obj){
    return obj
  }
  obj = target[routesSymbol].filter(function(item){
      return item.name === name;
    })[0];
  return obj;
}
