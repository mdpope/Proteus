import Foundation
import AuthenticationServices
import CryptoKit
import Security
import UIKit

struct LifeCredential: Codable {
    var origin: String
    var clientID: String
    var accessToken: String
    var refreshToken: String
    var expiresAt: Date
    var accountID: String
    var workspaceID: String
    var appAuthorized: Bool? = nil
}

enum LifeKeychain {
    static let service = "org.proteusapp.proteus.mobile.life"
    static func query(_ service: String) -> [String: Any] { [kSecClass as String:kSecClassGenericPassword,kSecAttrService as String:service,kSecAttrAccount as String:"website-account"] }
    static func load(service: String = service) -> LifeCredential? {
        var q=query(service);q[kSecReturnData as String]=true;q[kSecMatchLimit as String]=kSecMatchLimitOne
        var item:CFTypeRef?;guard SecItemCopyMatching(q as CFDictionary,&item)==errSecSuccess,let data=item as? Data else{return nil}
        return try? JSONDecoder().decode(LifeCredential.self,from:data)
    }
    static func save(_ value: LifeCredential, service: String = service) throws {
        let q=query(service),attributes:[String:Any]=[kSecValueData as String:try JSONEncoder().encode(value),kSecAttrAccessible as String:kSecAttrAccessibleWhenUnlockedThisDeviceOnly]
        let status=SecItemUpdate(q as CFDictionary,attributes as CFDictionary)
        if status==errSecItemNotFound {var item=q;attributes.forEach{item[$0.key]=$0.value};guard SecItemAdd(item as CFDictionary,nil)==errSecSuccess else{throw RemoteError(message:"Life sign-in could not be saved securely.")}}
        else if status != errSecSuccess {throw RemoteError(message:"Life sign-in could not be updated securely.")}
    }
    static func clear(service:String = service){SecItemDelete(query(service) as CFDictionary)}
}

struct LifeOAuthAttempt {
    static let callback="proteus://life-oauth/callback"
    let state:String
    let verifier:String
    init(state:String = RemoteCrypto.random(),verifier:String = RemoteCrypto.random()){self.state=state;self.verifier=verifier}
    var challenge:String{Data(SHA256.hash(data:Data(verifier.utf8))).base64EncodedString().replacingOccurrences(of:"+",with:"-").replacingOccurrences(of:"/",with:"_").replacingOccurrences(of:"=",with:"")}
    func authorization(origin:String,clientID:String, sharedApp:Bool=false)throws->URL{
        guard var url=URLComponents(string:origin+"/oauth/authorize") else{throw RemoteError(message:"Invalid Life website.")}
        url.queryItems=[URLQueryItem(name:"response_type",value:"code"),URLQueryItem(name:"client_id",value:clientID),URLQueryItem(name:"redirect_uri",value:Self.callback),URLQueryItem(name:"scope",value:sharedApp ? "brain:read brain:write app:read app:write" : "brain:read brain:write"),URLQueryItem(name:"state",value:state),URLQueryItem(name:"code_challenge",value:challenge),URLQueryItem(name:"code_challenge_method",value:"S256")]
        guard let value=url.url else{throw RemoteError(message:"Invalid Life sign-in URL.")};return value
    }
    func code(from callback:URL)throws->String{
        guard let url=URLComponents(url:callback,resolvingAgainstBaseURL:false),url.scheme=="proteus",url.host=="life-oauth",url.path=="/callback",url.user==nil,url.password==nil,url.port==nil,url.fragment==nil else{throw RemoteError(message:"Life sign-in returned an unexpected callback.")}
        let items=url.queryItems ?? [];let states=items.filter{$0.name=="state"}
        guard states.count==1,states.first?.value==state else{throw RemoteError(message:"Life sign-in could not be verified. Start again.")}
        guard !items.contains(where:{$0.name=="error"}) else{throw RemoteError(message:"Life sign-in was not authorized.")}
        let codes=items.filter{$0.name=="code"};guard codes.count==1,let code=codes.first?.value,!code.isEmpty else{throw RemoteError(message:"Life sign-in returned no authorization code.")};return code
    }
    static func origin(_ value:String)throws->String{
        guard var url=URLComponents(string:value.trimmingCharacters(in:.whitespacesAndNewlines)),url.scheme=="https",let host=url.host,!host.isEmpty,url.user==nil,url.password==nil,url.query==nil,url.fragment==nil,["","/"].contains(url.path),url.port==nil || (1...65535).contains(url.port!) else{throw RemoteError(message:"Enter the HTTPS website origin, without a path or account details.")}
        url.path="";guard let result=url.string,url.url != nil else{throw RemoteError(message:"Invalid Life website.")};return result
    }
}

private final class LifeRedirectGuard:NSObject,URLSessionTaskDelegate,@unchecked Sendable{
    func urlSession(_ session:URLSession,task:URLSessionTask,willPerformHTTPRedirection response:HTTPURLResponse,newRequest request:URLRequest,completionHandler:@escaping(URLRequest?)->Void){completionHandler(nil)}
}
struct LifeHTTPError:Error{let status:Int;let message:String}

/// Life belongs to the authenticated website account, never the currently selected computer.
/// Health records and form drafts stay in memory; only OAuth credentials are persisted in Keychain.
@MainActor final class LifeStore:NSObject,ObservableObject,ASWebAuthenticationPresentationContextProviding{
    @Published private(set) var profile:JSON = .null
    @Published private(set) var connected=false
    @Published private(set) var busy=false
    @Published var error:String?
    @Published var notice:String?
    @Published private(set) var dataRevision=0
    private(set) var credential:LifeCredential?
    private let keychainService:String
    private let session:URLSession
    private var authSession:ASWebAuthenticationSession?
    private var refreshTask:Task<Void,Error>?
    private var generation=UUID()
    private var closing=false
    private var snapshots:[String:JSON]=[:]
    var accountIdentity:String{credential.map{$0.origin+"|"+$0.accountID+"|"+$0.workspaceID} ?? "signed-out"}
    var website:String{credential?.origin ?? "https://proteus.example"}
    var signedIn:Bool{credential != nil}
    var readOnly:Bool{profile["readOnly"].bool || !connected}
    var capabilities:[String]{profile["capabilities"].array.map(\.string)}
    init(keychainService:String=LifeKeychain.service,session:URLSession?=nil){
        self.keychainService=keychainService;credential=LifeKeychain.load(service:keychainService)
        #if DEBUG
        let supplied = session ?? (ProcessInfo.processInfo.arguments.contains("--synthetic-life") ? LifeUITestProtocol.session() : nil)
        #else
        let supplied = session
        #endif
        if let supplied{self.session=supplied}else{let configuration=URLSessionConfiguration.ephemeral;configuration.urlCache=nil;configuration.httpCookieStorage=nil;configuration.httpShouldSetCookies=false;configuration.timeoutIntervalForRequest=30;configuration.timeoutIntervalForResource=45;self.session=URLSession(configuration:configuration,delegate:LifeRedirectGuard(),delegateQueue:nil)}
        super.init()
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--synthetic-life") {
            credential=LifeCredential(origin:"https://synthetic-life.invalid",clientID:"synthetic",accessToken:"synthetic",refreshToken:"synthetic",expiresAt:Date().addingTimeInterval(3600),accountID:"synthetic-life-account",workspaceID:"1")
            profile = .object(LifeUITestProtocol.identity);connected=true
        }
        #endif
    }
    func presentationAnchor(for session:ASWebAuthenticationSession)->ASPresentationAnchor{
        UIApplication.shared.connectedScenes.compactMap{$0 as? UIWindowScene}.flatMap(\.windows).first(where: \.isKeyWindow) ?? ASPresentationAnchor()
    }
    private func clearRecords(){profile = .null;snapshots.removeAll();connected=false;dataRevision += 1}
    private func clearCredentials(){generation=UUID();refreshTask?.cancel();refreshTask=nil;credential=nil;LifeKeychain.clear(service:keychainService);clearRecords()}
    func restore()async{guard credential != nil else{return};do{try await refreshProfile()}catch{self.error=display(error);connected=false}}
    func signIn(website:String, sharedApp:Bool=false)async{
        guard !busy else{return};busy=true;defer{busy=false};error=nil;notice=nil
        do{
            let origin=try LifeOAuthAttempt.origin(website)
            let discovery=try await raw(origin:origin,path:"/api/v1/native-config")
            guard discovery["enabled"].bool,discovery["protocol"].int==1,discovery["issuer"].string==origin,discovery["redirectUri"].string==LifeOAuthAttempt.callback,!discovery["clientId"].string.isEmpty else{throw RemoteError(message:"Native Life sign-in is not configured on this website.")}
            let attempt=LifeOAuthAttempt(),clientID=discovery["clientId"].string
            let url=try attempt.authorization(origin:origin,clientID:clientID,sharedApp:sharedApp)
            let callback:URL=try await withCheckedThrowingContinuation{continuation in
                let authentication=ASWebAuthenticationSession(url:url,callbackURLScheme:"proteus"){url,error in
                    if let url{continuation.resume(returning:url)}else{continuation.resume(throwing:RemoteError(message:error == nil ? "Life sign-in did not complete." : "Life sign-in was cancelled or could not finish."))}
                }
                authentication.presentationContextProvider=self;self.authSession=authentication
                if !authentication.start(){self.authSession=nil;continuation.resume(throwing:RemoteError(message:"The system sign-in browser could not open."))}
            }
            authSession=nil
            let code=try attempt.code(from:callback)
            let token=try await raw(origin:origin,path:"/oauth/token",method:"POST",form:["grant_type":"authorization_code","client_id":clientID,"redirect_uri":LifeOAuthAttempt.callback,"code_verifier":attempt.verifier,"code":code])
            guard !token["access_token"].string.isEmpty,!token["refresh_token"].string.isEmpty,token["token_type"].string.lowercased()=="bearer",token["expires_in"].int>0 else{throw RemoteError(message:"Website returned an incomplete sign-in.")}
            // Verify identity before showing any account records or saving credentials.
            let identity=try await raw(origin:origin,path:"/api/v1/life",bearer:token["access_token"].string)
            guard !identity["accountId"].string.isEmpty,!identity["workspaceId"].string.isEmpty else{throw RemoteError(message:"Website returned no Life account identity.")}
            if sharedApp, let current=credential, current.origin != origin || current.accountID != identity["accountId"].string || current.workspaceID != identity["workspaceId"].string { throw RemoteError(message:"Use the same website account to add Team access. The existing Life session was preserved.") }
            let next=LifeCredential(origin:origin,clientID:clientID,accessToken:token["access_token"].string,refreshToken:token["refresh_token"].string,expiresAt:Date().addingTimeInterval(Double(token["expires_in"].int)),accountID:identity["accountId"].string,workspaceID:identity["workspaceId"].string,appAuthorized:sharedApp)
            try LifeKeychain.save(next,service:keychainService);generation=UUID();refreshTask?.cancel();refreshTask=nil;clearRecords();credential=next;profile=identity;connected=true
        }catch{authSession=nil;self.error=display(error)}
    }
    func signOut()async{
        guard !busy else{return};busy=true;closing=true;clearRecords()
        defer{busy=false;closing=false}
        // An in-flight refresh may rotate the token. Revoke its final credential, not its predecessor.
        if let refreshTask{_ = try? await refreshTask.value}
        let previous=credential;clearCredentials();error=nil
        if let previous{
            do{_ = try await raw(origin:previous.origin,path:"/api/v1/native-session",method:"DELETE",bearer:previous.accessToken);notice="Signed out. This website session was revoked."}
            catch{notice="Signed out on this device. The website could not confirm revocation; manage active connections on the website if needed."}
        }
    }
    private func refreshAccess(failedToken:String?=nil)async throws{
        if let failedToken,credential?.accessToken != failedToken{return}
        if let refreshTask{try await refreshTask.value;return}
        guard !closing,let current=credential else{throw RemoteError(message:"Sign in to Life first.")};let expected=generation
        let task=Task{ @MainActor in
            do{
                let value=try await self.raw(origin:current.origin,path:"/oauth/token",method:"POST",form:["grant_type":"refresh_token","client_id":current.clientID,"refresh_token":current.refreshToken])
                guard expected==self.generation else{throw RemoteError(message:"Life account changed.")}
                guard !value["access_token"].string.isEmpty,!value["refresh_token"].string.isEmpty,value["expires_in"].int>0 else{throw RemoteError(message:"Website returned an incomplete refreshed session.")}
                var next=current;next.accessToken=value["access_token"].string;next.refreshToken=value["refresh_token"].string;next.expiresAt=Date().addingTimeInterval(Double(value["expires_in"].int))
                try LifeKeychain.save(next,service:self.keychainService);self.credential=next
            }catch let error as LifeHTTPError where [400,401,403].contains(error.status){if expected==self.generation{self.clearCredentials()};throw RemoteError(message:"Life sign-in expired or was revoked. Sign in again.")}
        }
        refreshTask=task;defer{if expected==generation{refreshTask=nil}};try await task.value
    }
    private func authorized(path:String,method:String="GET",body:JSON?=nil)async throws->JSON{
        let expected=generation
        guard !closing,let current=credential else{throw RemoteError(message:"Sign in to Life first.")}
        if current.expiresAt.timeIntervalSinceNow<60{try await refreshAccess()}
        guard expected==generation,!closing,let current=credential else{throw RemoteError(message:"Life account changed.")}
        do{let result=try await raw(origin:current.origin,path:path,method:method,body:body,bearer:current.accessToken);guard expected==generation,!closing else{throw RemoteError(message:"Life account changed.")};return result}
        catch let error as LifeHTTPError where error.status==401{
            guard expected==generation,!closing else{throw RemoteError(message:"Life account changed.")}
            try await refreshAccess(failedToken:current.accessToken);guard expected==generation,!closing,let next=credential else{throw RemoteError(message:"Life account changed.")}
            do{let result=try await raw(origin:next.origin,path:path,method:method,body:body,bearer:next.accessToken);guard expected==generation,!closing else{throw RemoteError(message:"Life account changed.")};return result}
            catch let second as LifeHTTPError where second.status==401{if expected==generation,credential?.accessToken==next.accessToken{clearCredentials();throw RemoteError(message:"Life session was revoked. Sign in again.")};throw RemoteError(message:"Life session refreshed while this request was in flight. Please retry.")}
        }
    }
    func appRequest(_ path:String="", method:String="GET", body:JSON?=nil, collections:[String]?=nil)async throws->JSON {
        guard credential?.appAuthorized == true else { throw RemoteError(message:"Connect shared Team tools in Account & Security. Existing Life access does not grant shared app access.") }
        guard path.isEmpty || (path.hasPrefix("/") && !path.contains("..") && !path.contains("?")) else { throw RemoteError(message:"Invalid app endpoint.") }
        var query = ""
        if let collections {
            let allowed = Set(["browserProfiles", "teamLists", "links", "history", "notifications", "logs"])
            guard path.isEmpty, method == "GET", collections.allSatisfy({ allowed.contains($0) }) else { throw RemoteError(message:"Invalid account collection.") }
            query = "?view=bootstrap" + (collections.isEmpty ? "" : "&include=" + collections.joined(separator: ","))
        }
        var payload = body
        if method != "GET", case .object(var fields) = body { fields["expectedAccountId"] = .string(credential?.accountID ?? ""); fields["expectedWorkspaceId"] = .string(credential?.workspaceID ?? ""); payload = .object(fields) }
        let result = try await authorized(path:"/api/v1/app"+path+query,method:method,body:payload)
        if path.isEmpty { try verifyAccount(result) }
        return result
    }
    func refreshProfile()async throws{
        let value=try await authorized(path:"/api/v1/life")
        guard let current=credential,value["accountId"].string==current.accountID,value["workspaceId"].string==current.workspaceID else{clearCredentials();throw RemoteError(message:"Life account or workspace changed. Sign in again to load its records.")}
        profile=value;connected=true
    }
    func data(section:String,query:[String:JSON]=[:])async throws->JSON{
        let result=try await authorized(path:"/api/v1/life/data",method:"POST",body:.object(["section":.string(section),"query":.object(query)]));try verifyAccount(result);connected=true
        snapshots[section]=result;return result
    }
    func action(_ action:String,input:[String:JSON],idempotencyKey:String)async throws->JSON{
        guard connected,!readOnly else{throw RemoteError(message:"Reconnect to Life before saving changes.")}
        let result=try await authorized(path:"/api/v1/life/action",method:"POST",body:.object(["action":.string(action),"input":.object(input),"idempotencyKey":.string(idempotencyKey),"expectedAccountId":.string(credential?.accountID ?? ""),"expectedWorkspaceId":.string(credential?.workspaceID ?? "")]));try verifyAccount(result);dataRevision += 1;return result
    }
    private func verifyAccount(_ value:JSON)throws{
        guard let current=credential,value["accountId"].string==current.accountID,value["workspaceId"].string==current.workspaceID else{clearCredentials();throw RemoteError(message:"Life account or workspace changed. Sign in again before continuing.")}
    }
    func evidence(_ id:String)async throws->(Data,String){
        guard !id.isEmpty,id.allSatisfy({$0.isLetter || $0.isNumber || $0=="-"}) else{throw RemoteError(message:"Invalid evidence identifier.")}
        try await refreshProfile()
        guard !closing,let current=credential else{throw RemoteError(message:"Sign in first.")};let expected=generation
        var request=URLRequest(url:URL(string:current.origin+"/api/v1/life/evidence/"+id)!);request.setValue("Bearer "+current.accessToken,forHTTPHeaderField:"Authorization")
        let (data,response)=try await session.data(for:request);guard expected==generation,!closing else{throw RemoteError(message:"Life account changed.")}
        guard let response=response as? HTTPURLResponse,response.statusCode==200,data.count<=20*1024*1024 else{throw RemoteError(message:"Evidence is unavailable or exceeds 20 MB.")}
        return(data,response.mimeType ?? "application/octet-stream")
    }
    private func raw(origin:String,path:String,method:String="GET",body:JSON?=nil,form:[String:String]?=nil,bearer:String?=nil)async throws->JSON{
        guard let url=URL(string:origin+path) else{throw RemoteError(message:"Invalid Life request.")}
        var request=URLRequest(url:url);request.httpMethod=method;request.setValue("application/json",forHTTPHeaderField:"Accept")
        if let bearer{request.setValue("Bearer "+bearer,forHTTPHeaderField:"Authorization")}
        if let body{request.httpBody=try JSONEncoder().encode(body);request.setValue("application/json",forHTTPHeaderField:"Content-Type")}
        if let form{var encoded=URLComponents();encoded.queryItems=form.sorted{$0.key<$1.key}.map{URLQueryItem(name:$0.key,value:$0.value)};request.httpBody=encoded.percentEncodedQuery?.replacingOccurrences(of:"+",with:"%2B").data(using:.utf8);request.setValue("application/x-www-form-urlencoded",forHTTPHeaderField:"Content-Type")}
        let(data,response)=try await session.data(for:request)
        guard let response=response as? HTTPURLResponse else{throw RemoteError(message:"Website returned an invalid response.")}
        guard data.count<=30*1024*1024 else{throw RemoteError(message:"Website response is too large.")}
        let value=(try? JSONDecoder().decode(JSON.self,from:data)) ?? .null
        guard (200...299).contains(response.statusCode) else{throw LifeHTTPError(status:response.statusCode,message:response.statusCode==403 ? "Your account does not allow this action." : value["message"].string.isEmpty ? "Website request failed (\(response.statusCode))." : String(value["message"].string.prefix(250)))}
        return value
    }
    func display(_ error:Error)->String{if let error=error as? LifeHTTPError{return error.message};if error is URLError{return "Life website is unreachable. Your account stays saved; reconnect before making changes."};return error.localizedDescription}
}
