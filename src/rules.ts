import { Context } from 'koa';

// body is defined because bodyParser is used
declare module "koa" {
    interface Request {
        body: any;
        rawBody: string;
    }
}


export interface rulesConfig{
  rules?: {
    [index: string]: (config?: object) => ((ctx: Context, next: () => Promise<any>) => any)
  };
  helper?: {
    [index: string]: Function;
  };
}

const toExport: rulesConfig = {rules:{}, helper:{}};
toExport.rules.allowAll = allowAll;
function allowAll(){
  return function allowAllInner(ctx: Context, next: Function){
    return next();
  }
}
toExport.rules.denyAll = denyAll;
function denyAll(){
  return function denyAllInner(ctx: Context, next: Function){
    const user = ctx.state.user;
    if(isAdmin(user, this.superUsersRoles)){
      return next();
    }
    return ctx.throw(404);
  }
}
toExport.rules.allowOwn = allowOwn;
function allowOwn(ruleConfig = {field: 'userId'}){

  let field = ruleConfig.field
  return function allowOwnInner(ctx: Context, next: Function){
    const user = ctx.state.user;
    if(isAdmin(user, this.superUsersRoles)){
      return next();
    }
    switch(ctx.request.method){
      case 'GET':
        ctx.state.filter = {
          [field]: user.id
        }
        return next();
      case 'POST':
        if(ctx.request.body && ctx.request.body.data && ctx.request.body.data.attributes && +ctx.request.body.data.attributes[field] === user.id){
          return next();
        }
        else{
          return ctx.throw(401)
        }
      case 'PATCH':
        let didChangeId = ctx.request.body && ctx.request.body.data && ctx.request.body.data.attributes && +ctx.request.body.data.attributes[field] !== user.id;
        if(didChangeId){
          return ctx.throw(401)
        }
        ctx.state.filter = {
          id: ctx.params.id,
          [field]: user.id
        }
        return next();
      case 'DELETE':
        ctx.state.filter = {
          id: ctx.params.id,
          [field]: user.id
        }
        return next();
    }
  }
}
toExport.rules.allowOwnUser = allowOwnUser;
function allowOwnUser(){
  return function allowOwnUserInner(ctx: Context, next: Function){
    const user = ctx.state.user;
    if(isAdmin(user, this.superUsersRoles)){
      return next();
    }
    switch(ctx.request.method){
      case 'GET':
        if(+ctx.params.id !== user.id){
          return ctx.throw(404);
        }
        return next();
        break;
      case 'PATCH':
      ctx.state.filter = {
          id: user.id
        }
        return next();
        break;
    }
  }
}


toExport.helper.isAdmin = isAdmin;
function isAdmin(user: {perm: string[]}, superUsers: string[]): boolean{
  for(let superUser of superUsers){
    if(user.perm.includes(superUser)){
      return true;
    }
  }
  return false;
}

export default toExport;