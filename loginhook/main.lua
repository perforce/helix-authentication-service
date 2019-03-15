--[[
  Authentication extensions for OpenID Connect and SAML 2.0

  Copyright 2019 Perforce Software
]]--
local cjson = require "cjson"
local curl = require "cURL.safe"
package.path = Perforce.GetArchDirFileName( "?.lua" )
local utils = require "ExtUtils"

function GetExtGConfigFields()
  return {
    [ "Service-URL" ] = "The authentication service base URL.",
    [ "Auth-Protocol" ] = "Authentication protocol, such as saml or oidc."
  }
end

function GetExtConfigFields()
  return {
    [ "non-sso-users" ] = "Those users who will not be using SSO.",
    [ "user-identifier" ] = "Trigger variable used as unique user identifier.",
    [ "name-identifier" ] = "Field within IdP response containing unique user identifer."
  }
end

function GetExtConfigHooks()
  return {
    [ "auth-pre-sso" ] = "auth",
    [ "auth-check-sso" ] = "auth"
  }
end

local function curlResponseFmt( url, ok, data )
  local msg = "Error getting data from auth service (" .. url .. "):  "
  if not ok then
    return false, url, msg .. tostring( data )
  end
  if data[ "error" ] ~= nil then
    return false, url, msg .. data[ "error" ]
  end
  return true, url, data
end

-- Connect to auth service and convert the JSON response to a table.
local function getData( url )
  --[[
    Lua-cURLv3: https://github.com/Lua-cURL/Lua-cURLv3
    See the API docs for lcurl (http://lua-curl.github.io/lcurl/modules/lcurl.html)
    as that describes much more of the functionality than the Lua-cURLv3 API docs.
  ]]--
  local c = curl.easy()
  local rsp = ""
  c:setopt( curl.OPT_URL, url )
  -- Store all the data in memory in the 'rsp' variable.
  c:setopt( curl.OPT_WRITEFUNCTION, function( chunk ) rsp = rsp .. chunk end )
  -- https://curl.haxx.se/docs/caextract.html
  -- c:setopt_cainfo( Perforce.GetArchDirFileName( "cacert.pem" ) )
  c:setopt_useragent( utils.getID() )
  -- verification can be set to true only if the certs are not self-signed
  c:setopt( curl.OPT_SSL_VERIFYPEER, false )
  c:setopt( curl.OPT_SSL_VERIFYHOST, false )
  local ok, err = c:perform()
  local code = c:getinfo( curl.INFO_RESPONSE_CODE )
  c:close()
  if code == 200 then
    return curlResponseFmt( url, ok, ok and cjson.decode( rsp ) or err )
  end
  return false, code, err
end

local function validateResponse( url, response )
  local easy = curl.easy()
  local encoded_response = easy:escape( response )
  local c = curl.easy{
    url        = url,
    post       = true,
    httpheader = {
      "Content-Type: application/x-www-form-urlencoded",
    },
    postfields = "SAMLResponse=" .. encoded_response,
  }
  c:setopt_useragent( utils.getID() )
  local rsp = ""
  c:setopt( curl.OPT_WRITEFUNCTION, function( chunk ) rsp = rsp .. chunk end )
  -- verification can be set to true only if the certs are not self-signed
  c:setopt( curl.OPT_SSL_VERIFYPEER, false )
  c:setopt( curl.OPT_SSL_VERIFYHOST, false )
  local ok, err = c:perform()
  local code = c:getinfo( curl.INFO_RESPONSE_CODE )
  c:close()
  if code == 200 then
    return curlResponseFmt( url, ok, ok and cjson.decode( rsp ) or err )
  end
  return false, code, err
end

--[[
  An Extension once loaded, has its runtime persist for the life of the
  RhExtension instance. This means that if you have some variable declared
  outside of your callbacks, that it will be around next time a callback
  is invoked.
]]--
local requestId = nil

function AuthPreSSO()
  utils.init()
  local user = Perforce.GetTrigVar( "user" )
  if utils.isSkipUser( user ) then
    return true, "unused", "http://example.com", true
  end
  -- Get a request id from the service, save it in requestId; do this every time
  -- for every user, in case the same user logs in from multiple systems. We
  -- will use this request identifier to get the status of the user later.
  local userid = utils.userIdentifier()
  local easy = curl.easy()
  local safe_id = easy:escape( userid )
  local ok, url, sdata = getData( utils.requestUrl() .. safe_id )
  if ok then
    requestId = sdata[ "request" ]
  else
    return false
  end
  local url = utils.loginUrl() .. requestId
  local ssoArgs = Perforce.GetTrigVar( "ssoArgs" )
  if utils.isLegacy( ssoArgs ) then
    return true, url
  end
  return true, "unused", url, false
end

function AuthCheckSSO()
  utils.init()
  local userid = utils.userIdentifier()
  -- If a password/token has been provided, then perhaps this is the legacy
  -- support scenario, and the token is the SAML response coming from the
  -- desktop agent or Swarm. In that case, try to extract the response and send
  -- it to the service for validation. If that works, we're done, otherwise fall
  -- back to the normal behavior.
  local password = Perforce.GetTrigVar( "token" )
  local response = utils.getResponse( password )
  if response then
    -- send SAML response to auth service for validation
    local ok, url, sdata = validateResponse( utils.validateUrl(), response )
    if ok then
      return userid == utils.nameIdentifier( sdata )
    end
  end
  -- Commence so-called normal behavior, in which we request the authenticated
  -- user data using a long-poll on the auth service. The service request will
  -- time out if the user does not authenticate with the IdP in a timely manner.
  local ok, url, sdata = getData( utils.statusUrl() .. requestId )
  if ok then
    return userid == utils.nameIdentifier( sdata )
  end
  return false
end
