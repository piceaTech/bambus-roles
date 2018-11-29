import { Context } from 'koa';

export interface rulesConfig{
  rules?: {
    [index: string]: (ctx: Context, next: () => Promise<any>) => any
  };
  helper?: {
    [index: string]: Function;
  };
}

const toExport: rulesConfig = {rules:{}, helper:{}};
toExport.rules.allowAll = allowAll;
function allowAll(ctx: Context, next: Function){
  return next();
}
toExport.rules.denyAll = denyAll;
function denyAll(ctx: Context, next: Function){
  const user = ctx.state.user;
  if(isAdmin(user, this.superUsersRoles)){
    //ignore for now
    // return next();
  }
  return ctx.throw(403);
}
toExport.rules.allowOwn = allowOwn;
function allowOwn(ctx: Context, next: Function){
  const user = ctx.state.user;
  if(isAdmin(user, this.superUsersRoles)){
    //ignore for now
    // return next();
  }
  switch(ctx.request.method){
    case 'GET':
      ctx.state.query = {
        userId: user.id
      }
      return next();
      break;
    case 'POST':
      // body has to contain user id
      break;
    case 'PATCH':
      // userID can not be contained
      // set userid in query
      break;
    case 'DELETE':
      // must contain userid
      break;
  }
}
toExport.rules.allowOwnUser = allowOwnUser;
function allowOwnUser(ctx: Context, next: Function){
  const user = ctx.state.user;
  if(isAdmin(user, this.superUsersRoles)){
    //ignore for now
    // return next();
  }
  switch(ctx.request.method){

    case 'GET':
      if(+ctx.params.id !== user.id){
        return ctx.throw(404);
      }
      return next();
      break;
    case 'PATCH':
    ctx.state.query = {
        id: user.id
      }
      return next();
      break;
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