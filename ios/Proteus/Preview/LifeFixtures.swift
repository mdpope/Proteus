#if DEBUG
import Foundation

/// Explicit simulator-only UI fixture. Never enabled by normal launches or website sign-in.
final class LifeUITestProtocol:URLProtocol,@unchecked Sendable {
    static let identity:[String:JSON]=["accountId":.string("synthetic-life-account"),"workspaceId":.string("1"),"displayName":.string("Synthetic Life account"),"readOnly":.bool(false),"capabilities":.array(["garage.read","garage.add","garage.edit","nutrition.read","nutrition.add","nutrition.edit"].map(JSON.string))]
    static func session()->URLSession{let c=URLSessionConfiguration.ephemeral;c.protocolClasses=[LifeUITestProtocol.self];return URLSession(configuration:c)}
    override class func canInit(with request:URLRequest)->Bool{request.url?.host=="synthetic-life.invalid"}
    override class func canonicalRequest(for request:URLRequest)->URLRequest{request}
    override func startLoading(){
        let path=request.url!.path
        var output=Self.identity
        if path.hasSuffix("/data"){
            var body=request.httpBody
            if body==nil,let stream=request.httpBodyStream{stream.open();defer{stream.close()};var data=Data();let buffer=UnsafeMutablePointer<UInt8>.allocate(capacity:4096);defer{buffer.deallocate()};while stream.hasBytesAvailable{let n=stream.read(buffer,maxLength:4096);if n<=0{break};data.append(buffer,count:n)};body=data}
            let input=(try? JSONDecoder().decode(JSON.self,from:body ?? Data())) ?? .null
            output.merge(Self.section(input["section"].string,query:input["query"])){$1}
        }else if path.hasSuffix("/action"){output["ok"] = .bool(true);output["record"] = .object(["id":.number(42)])}
        let data=try! JSONEncoder().encode(JSON.object(output))
        client?.urlProtocol(self,didReceive:HTTPURLResponse(url:request.url!,statusCode:200,httpVersion:nil,headerFields:["Content-Type":"application/json"])!,cacheStoragePolicy:.notAllowed)
        client?.urlProtocol(self,didLoad:data);client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading(){}
    static func section(_ section:String,query:JSON)->[String:JSON]{
        let macros:[String:JSON]=["calories":.number(1920),"protein":.number(142),"carbs":.number(180),"fat":.number(64)]
        let vehicle:JSON = .object(["id":.number(1),"name":.string("Synthetic touring car"),"kind":.string("car"),"year":.number(2024),"fuel_type":.string("gas"),"notes":.string("Synthetic records only")])
        let report:JSON = .object(["weightedMpg":.number(28.4),"eligibleMiles":.number(920),"eligibleGallons":.number(32.4),"monthlyEstimates":.array([.object(["month":.string("2026-10"),"miles":.number(540)])]),"yearlyEstimates":.array([.object(["year":.number(2026),"miles":.number(8900)])])])
        let card:JSON = .object(["vehicle":vehicle,"historyCount":.number(12),"openTaskCount":.number(2),"oilAnalysisCount":.number(1),"report":report,"latestObservation":.object(["date":.string("2026-10-01"),"miles":.number(18420)])])
        let capture:JSON = .object(["id":.number(1),"vehicle_id":.number(1),"kind":.string("oil_analysis"),"status":.string("review"),"title":.string("Synthetic oil sample"),"notes":.string("Review original report before accepting."),"payload":.object(["analysis_status":.string("reported"),"lab":.string("Synthetic lab"),"sample_date":.string("2026-09-25"),"report_date":.string("2026-09-30"),"report_number":.string("TEST-1"),"lab_comments":.string("Synthetic lab commentary"),"measurements":.array([.object(["name":.string("Iron"),"value":.string("12"),"unit":.string("ppm"),"reference":.string("<30"),"unit_average":.string("14"),"universal_average":.string("16")])])]),"uncertainties":.array([])])
        switch section{
        case "overview":return ["counts":.object(["vehicles":.number(2),"review":.number(3),"foods":.number(48),"meals":.number(225)]),"nutrition":.object(macros),"tasks":.array([.object(["id":.number(1),"title":.string("Rotate tires"),"due_on":.string("2026-11-01"),"status":.string("open")])]),"recentAudit":.array([])]
        case "nutrition":
            let definitions = [("all_complete_days","All complete days"),("this_month","This month"),("last_30_calendar_days","Last 30 calendar days")]
            let periods: [JSON] = definitions.map { id, label in
                let month = id == "this_month"
                let all = id == "all_complete_days"
                var value = macros
                value["id"] = .string(id)
                value["label"] = .string(label)
                value["from"] = all ? .null : .string(month ? "2026-10-01" : "2026-09-05")
                value["through"] = all ? .null : .string("2026-10-04")
                value["completeDays"] = .number(month ? 3 : 24)
                value["loggedDays"] = .number(month ? 4 : 26)
                value["partialDays"] = .number(month ? 1 : 2)
                value["unloggedDays"] = all ? .null : .number(month ? 0 : 4)
                value["entryCount"] = .number(92)
                return .object(value)
            }
            let food:JSON = .object(["id":.number(1),"food_id":.number(1),"name":.string("Synthetic oatmeal"),"serving":.string("1 bowl"),"source_type":.string("label"),"is_estimate":.bool(false)].merging(macros){$1})
            return ["periodSummaries":.array(periods),"averages":.object(macros),"monthly":.array([]),"days":.array([.object(["date":.string("2026-10-04"),"complete":.bool(true),"entryCount":.number(3),"foodNames":.array([.string("Synthetic oatmeal")])].merging(macros){$1})]),"entries":.array([.object(["id":.number(1),"food_id":.number(1),"food_name":.string("Synthetic oatmeal"),"date":.string("2026-10-04"),"meal":.string("breakfast"),"qty":.number(1),"unit":.string("bowl")].merging(macros){$1})]),"foods":.array([food]),"versions":.array([food]),"page":.number(1),"hasMore":.bool(false)]
        case "garage":return ["vehicles":.array([vehicle]),"vehicleCards":.array([card]),"vehicle":query["vehicleId"] == .null ? .null:vehicle,"vehicleSummary":card,"report":report,"services":.array([]),"tasks":.array([]),"oilAnalyses":.array([capture])]
        case "fuel":return ["vehicles":.array([vehicle]),"vehicle":vehicle,"vehicleCards":.array([card]),"report":report,"fills":.array([]),"readings":.array([])]
        case "captures":return ["vehicles":.array([vehicle]),"captures":.array([capture]),"capture":query["captureId"] == .null ? .null:capture,"attachments":.array([]),"hasMore":.bool(false)]
        case "security":return ["user":.object(["name":.string("Synthetic account"),"email":.string("synthetic@example.test"),"twoFactorEnabled":.bool(true)]),"members":.array([]),"passkeys":.array([.object(["id":.number(1),"name":.string("Synthetic passkey"),"last_used_at":.string("2026-10-04")])]),"audit":.array([])]
        case "connections":return ["tokens":.array([.object(["name":.string("Synthetic connector"),"scopes":.array([.string("brain:read")]),"expires_at":.string("2026-10-30"),"revoked":.bool(false)])]),"clients":.array([]),"canRevokeTokens":.bool(false)]
        default:return [:]
        }
    }
}
#endif
