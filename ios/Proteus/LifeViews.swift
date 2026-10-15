import SwiftUI
import UniformTypeIdentifiers
import PDFKit

private enum LifeSection:String,CaseIterable,Identifiable{
    case overview,nutrition,garage,fuel,captures,security,connections
    var id:String{rawValue}
    var title:String{switch self{case .overview:"Overview";case .nutrition:"Nutrition";case .garage:"Garage";case .fuel:"Fuel";case .captures:"Evidence";case .security:"Account & security";case .connections:"Connections"}}
    var icon:String{switch self{case .overview:"square.grid.2x2";case .nutrition:"fork.knife";case .garage:"car";case .fuel:"fuelpump";case .captures:"tray.full";case .security:"person.crop.circle";case .connections:"link"}}
}
struct LifeRootView:View{
    @EnvironmentObject var life:LifeStore
    @State private var section:LifeSection? = .overview
    @AppStorage("nativeLifeSection") private var selectedSection = "overview"
    @State private var account=false
    var body:some View{
        Group{
            if life.signedIn{
                NavigationSplitView{
                    List(LifeSection.allCases.filter{life.profile["sections"].array.isEmpty || life.profile["sections"].array.contains(.string($0.rawValue))},selection:$section){item in NavigationLink(value:item){Label(item.title,systemImage:item.icon)}}
                        .navigationTitle("Life")
                        .safeAreaInset(edge:.bottom){VStack(alignment:.leading,spacing:4){Text(life.profile["displayName"].string).font(.caption.bold());Text("Website account · separate from computers").font(.caption2).foregroundStyle(.secondary)}.padding()}
                }detail:{LifePage(section:section ?? .overview).id(life.accountIdentity+"|"+(section ?? .overview).rawValue)}
                    .toolbar{ToolbarItem(placement:.primaryAction){Button{account=true}label:{Image(systemName:"person.crop.circle")}.accessibilityLabel("Life account")}}
                    .sheet(isPresented:$account){NavigationStack{LifeAccountView()}}
            }else{NavigationStack{LifeAccountView()}}
        }.task{section = LifeSection(rawValue: selectedSection) ?? .overview; await life.restore()}.onChange(of: selectedSection) { _, value in section = LifeSection(rawValue: value) ?? .overview }.onChange(of: section) { _, value in selectedSection = value?.rawValue ?? "overview" }
    }
}
struct LifeAccountView:View{
    @EnvironmentObject var life:LifeStore
    @Environment(\.dismiss) private var dismiss
    @State private var origin="https://proteus.example"
    var body:some View{
        NativeForm {
            Section{
                Label("Your records, together",systemImage:"heart.text.square").font(.title2.bold())
                Text("Nutrition, vehicles and evidence connect directly to your website account, even while your computers sleep.").foregroundStyle(.secondary)
            }
            if life.signedIn{
                Section("Signed in"){
                    Text(life.profile["displayName"].string.isEmpty ? "Life account" : life.profile["displayName"].string)
                    Text(life.website).font(.caption).foregroundStyle(.secondary)
                    Button("Refresh account"){Task{await life.restore()}}.disabled(life.busy)
                    Button("Sign out",role:.destructive){Task{await life.signOut()}}.disabled(life.busy).accessibilityIdentifier("life-sign-out")
                }
            }else{
                Section("Website"){
                    TextField("HTTPS website",text:$origin).keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled().accessibilityIdentifier("life-origin")
                    Button("Sign in securely"){Task{await life.signIn(website:origin)}}.disabled(life.busy).accessibilityIdentifier("life-sign-in")
                    Text("Complete the website’s passkey or authenticator verification in the system sign-in browser. Proteus never asks for database credentials.").font(.footnote).foregroundStyle(.secondary)
                }
            }
            if life.busy{ProgressView("Connecting…")}
            if let error=life.error{Text(error).foregroundStyle(.orange)}
            if let notice=life.notice{Text(notice).foregroundStyle(.secondary)}
            Section{Text("Records and drafts stay in memory on this device. Sign-out clears them. Website credentials are saved in this device’s Keychain, independently of computer pairings.").font(.footnote).foregroundStyle(.secondary)}
        }.background(NativeTheme.background).navigationTitle("Life account").toolbar{if life.signedIn{ToolbarItem(placement:.cancellationAction){Button("Done"){dismiss()}}}}
    }
}
private struct LifeActionSheet:Identifiable{let id=UUID();let action:String;var input:[String:JSON]=[:]}
private struct LifeEvidence:Identifiable{let id:String;let name:String}
private struct LifePage:View{
    @EnvironmentObject var life:LifeStore
    let section:LifeSection
    @State private var value:JSON = .null
    @State private var query:[String:JSON]=[:]
    @State private var busy=false
    @State private var failure:String?
    @State private var form:LifeActionSheet?
    @State private var evidence:LifeEvidence?
    @State private var search=""
    @State private var nutritionTab="averages"
    @State private var date=Date()
    @State private var from=Calendar.current.date(byAdding:.day,value:-29,to:Date()) ?? Date()
    @State private var through=Date()
    @State private var vehicleID=""
    @State private var captureID=""
    @State private var captureStatus="review"
    @State private var page=1
    @State private var foodID=""
    @State private var importing=false
    @State private var uploading=false
    private var canWrite:Bool{!life.readOnly && !value["readOnly"].bool}
    private func allowed(_ capability:String)->Bool{canWrite && life.capabilities.contains(capability)}
    private var refreshKey:String{section.rawValue+"|"+String(life.dataRevision)}
    var body:some View{
        ScrollView{
            LazyVStack(alignment:.leading,spacing:18){
                HStack{VStack(alignment:.leading){Text(section.title).font(.largeTitle.bold());Text("Life · website account").font(.caption).foregroundStyle(.secondary)};Spacer();if busy{ProgressView()}}
                if let failure{LifeCard("Could not refresh"){Text(failure).foregroundStyle(.orange);Button("Retry"){Task{await load()}}}}
                if value == .null && !busy{Text("Choose refresh to load your records.").foregroundStyle(.secondary)}
                switch section{
                case .overview:overview
                case .nutrition:nutrition
                case .garage:garage
                case .fuel:fuel
                case .captures:captures
                case .security:security
                case .connections:connections
                }
                if value["readOnly"].bool{Text("This account connection is read-only. Changes are unavailable.").font(.footnote).foregroundStyle(.secondary)}
            }.padding().frame(maxWidth:1100,alignment:.leading).frame(maxWidth:.infinity)
        }.background(Color(.systemGroupedBackground)).navigationTitle(section.title).navigationBarTitleDisplayMode(.inline)
            .toolbar{ToolbarItem(placement:.primaryAction){Button{Task{await load()}}label:{Image(systemName:"arrow.clockwise")}.disabled(busy).accessibilityLabel("Refresh Life records")}}
            .task(id:refreshKey){await load()}
            .onChange(of:section){_,_ in value = .null;query=[:];vehicleID="";captureID="";page=1}
            .sheet(item:$form){sheet in NavigationStack{LifeForm(action:sheet.action,initial:sheet.input,choices:value){await load()}}}
            .sheet(item:$evidence){item in NavigationStack{LifeEvidenceView(item:item)}}
            .fileImporter(isPresented:$importing,allowedContentTypes:[.data]){result in
                Task{do{let url=try result.get();guard url.startAccessingSecurityScopedResource() else{throw RemoteError(message:"This file could not be opened.")};defer{url.stopAccessingSecurityScopedResource()}
                    let size=(try url.resourceValues(forKeys:[.fileSizeKey])).fileSize ?? 0;guard size<=20*1024*1024 else{throw RemoteError(message:"Choose a file no larger than 20 MB.")}
                    let data=try Data(contentsOf:url);guard data.count<=20*1024*1024 else{throw RemoteError(message:"Choose a file no larger than 20 MB.")}
                    uploading=true;defer{uploading=false};let mime=UTType(filenameExtension:url.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
                    _ = try await life.action("attachment.add",input:["capture_id":.string(captureID),"name":.string(url.lastPathComponent),"mimeType":.string(mime),"base64":.string(data.base64EncodedString())],idempotencyKey:UUID().uuidString);await load()
                }catch{failure=life.display(error)}}
            }
    }
    private func load()async{
        guard !busy else{return};busy=true;defer{busy=false};failure=nil
        var q=query
        if section == .nutrition{q["page"] = .number(Double(page));q["tab"] = .string(nutritionTab);q["date"] = .string(Self.day(date));q["from"] = .string(Self.day(from));q["through"] = .string(Self.day(through));q["search"] = .string(search);if !foodID.isEmpty{q["foodId"] = .string(foodID)}}
        if section == .garage || section == .fuel{if !vehicleID.isEmpty{q["vehicleId"] = .string(vehicleID)}}
        if section == .captures{q["page"] = .number(Double(page));q["status"] = .string(captureStatus);if !captureID.isEmpty{q["captureId"] = .string(captureID)}}
        do{value=try await life.data(section:section.rawValue,query:q)}catch{failure=life.display(error)}
    }
    static func day(_ date:Date)->String{let f=DateFormatter();f.locale=Locale(identifier:"en_US_POSIX");f.dateFormat="yyyy-MM-dd";return f.string(from:date)}
    private func open(_ action:String,_ input:[String:JSON]=[:]){form=LifeActionSheet(action:action,input:input)}
    @ViewBuilder private func writeButton(_ title:String,_ action:String,_ capability:String,input:[String:JSON]=[:])->some View{
        Button(title){open(action,input)}.buttonStyle(.bordered).disabled(!allowed(capability)).help(allowed(capability) ? title : "Your account does not allow this change.")
    }
    private var overview:some View{
        Group{
            LazyVGrid(columns:[GridItem(.adaptive(minimum:130))],spacing:12){ForEach([("vehicles","Vehicles"),("review","To review"),("foods","Foods"),("meals","Meals")],id:\.0){key,label in LifeMetric(label,value:lifeNumber(value["counts"][key]))}}
            LifeCard("Today’s nutrition"){
                if value["nutrition"] == .null{Text("No meals logged today.").foregroundStyle(.secondary)}else{LifeMacros(value:value["nutrition"])}
            }
            LifeCard("Upcoming maintenance"){taskRows(value["tasks"].array)}
            LifeCard("Recent activity"){auditRows(value["recentAudit"].array)}
        }
    }
    private var nutrition:some View{
        Group{
            LifeCard("Nutrition"){
                Picker("View",selection:$nutritionTab){Text("Averages").tag("averages");Text("Days").tag("days");Text("Day").tag("day");Text("Foods").tag("foods");Text("Versions").tag("versions")}.pickerStyle(.menu).onChange(of:nutritionTab){_,_ in page=1;Task{await load()}}
                if nutritionTab=="day"{DatePicker("Day",selection:$date,displayedComponents:.date)}
                if ["days","averages"].contains(nutritionTab){DatePicker("From",selection:$from,displayedComponents:.date);DatePicker("Through",selection:$through,displayedComponents:.date)}
                TextField("Filter foods or entries",text:$search).textFieldStyle(.roundedBorder)
                if nutritionTab=="versions"{Picker("Food",selection:$foodID){Text("Choose food").tag("");ForEach(value["foods"].array,id: \.self){food in Text(food["name"].string).tag(lifeID(food["id"]))}}}
                Button("Apply filters"){page=1;Task{await load()}}.buttonStyle(.bordered).accessibilityIdentifier("life-nutrition-filter")
                HStack{writeButton("Log meal","meal.log","nutrition.add",input:["date":.string(Self.day(date))]);writeButton("Add food","food.save","nutrition.add")}
            }
            if nutritionTab=="averages"{
                ForEach(value["periodSummaries"].array,id:\.self){period in LifeCard(period["label"].string){
                    LifeMacros(value:period)
                    Text("Daily average · \(period["completeDays"].int) complete days").font(.caption).foregroundStyle(.secondary)
                    Text("\(period["loggedDays"].int) logged · \(period["partialDays"].int) partial" + (period["unloggedDays"] == .null ? "" : " · \(period["unloggedDays"].int) unlogged")).font(.caption2).foregroundStyle(.secondary)
                    if !period["from"].string.isEmpty{Text(period["from"].string+" – "+period["through"].string).font(.caption2).foregroundStyle(.secondary)}
                }.accessibilityIdentifier("life-period-"+period["id"].string)}
                LifeCard("Filtered daily average"){LifeMacros(value:value["averages"]);Text("Averages use complete days in the selected range. Partial and unlogged days are not counted as zero.").font(.caption).foregroundStyle(.secondary)}
                LifeCard("Monthly history"){ForEach(value["monthly"].array,id:\.self){month in VStack(alignment:.leading){Text(month["month"].string).font(.headline);LifeMacros(value:month);Text("\(month["completeDays"].int) complete days · \(month["entryCount"].int) entries").font(.caption).foregroundStyle(.secondary)};Divider()}}
            }else if nutritionTab=="days"{
                ForEach(value["days"].array,id:\.self){day in LifeCard(day["date"].string){LifeMacros(value:day);Text(day["complete"].bool ? "Complete day" : "Partial day").font(.caption).foregroundStyle(.secondary);Text(day["foodNames"].array.map(\.string).joined(separator:", ")).font(.caption);Button("View day"){if let parsed=Self.parseDay(day["date"].string){date=parsed};nutritionTab="day";Task{await load()}}}}
            }else if nutritionTab=="day"{
                ForEach(value["entries"].array,id:\.self){entry in LifeCard(entry["food_name"].string){Text(entry["meal"].string.capitalized+" · "+lifeNumber(entry["qty"])+" "+entry["unit"].string).font(.subheadline);LifeMacros(value:entry,multiplier:lifeDouble(entry["qty"]) ?? 1);if !entry["note"].string.isEmpty{Text(entry["note"].string)};HStack{writeButton("Edit","meal.update","nutrition.edit",input:entry.object);writeButton("Delete","meal.delete","nutrition.edit",input:entry.object)}}}
                if value["entries"].array.isEmpty{Text("No meals logged for this day.").foregroundStyle(.secondary)}
            }else if nutritionTab=="foods"{
                ForEach(value["foods"].array,id:\.self){food in LifeCard(food["name"].string){Text(food["serving"].string).font(.caption).foregroundStyle(.secondary);LifeMacros(value:food);source(food);writeButton("New version","food.save","nutrition.edit",input:food.object.merging(["food_id":food["id"]]){$1})}}
            }else{
                ForEach(value["versions"].array,id:\.self){version in LifeCard("Version "+lifeID(version["id"])){LifeMacros(value:version);source(version);Text(version["created_at"].string).font(.caption).foregroundStyle(.secondary)}}
            }
            HStack{Button("Previous"){page=max(1,page-1);Task{await load()}}.disabled(page==1);Spacer();Text("Page \(page)");Spacer();Button("Next"){page += 1;Task{await load()}}.disabled(!value["hasMore"].bool)}
        }
    }
    static func parseDay(_ value:String)->Date?{let f=DateFormatter();f.locale=Locale(identifier:"en_US_POSIX");f.dateFormat="yyyy-MM-dd";return f.date(from:value)}
    @ViewBuilder private func source(_ item:JSON)->some View{Text(lifeBool(item["is_estimate"]) ? "Estimated nutrition" : item["source_type"].string).font(.caption).foregroundStyle(.secondary);if !item["source_note"].string.isEmpty{Text(item["source_note"].string).font(.caption)}}
    private var vehiclePicker:some View{Picker("Vehicle",selection:$vehicleID){Text("All vehicles").tag("");ForEach(value["vehicles"].array,id:\.self){vehicle in Text(vehicle["name"].string).tag(lifeID(vehicle["id"]))}}.onChange(of:vehicleID){_,_ in Task{await load()}}}
    private var garage:some View{
        Group{
            LifeCard("Garage"){vehiclePicker;writeButton("Add vehicle","vehicle.save","garage.add")}
            if vehicleID.isEmpty{
                ForEach(value["vehicleCards"].array,id:\.self){card in LifeCard(card["vehicle"]["name"].string){vehicleCard(card);Button("Open vehicle"){vehicleID=lifeID(card["vehicle"]["id"]);Task{await load()}}}}
                if value["vehicleCards"].array.isEmpty{ForEach(value["vehicles"].array,id:\.self){vehicle in LifeCard(vehicle["name"].string){Text(vehicle["kind"].string.capitalized);Button("Open vehicle"){vehicleID=lifeID(vehicle["id"]);Task{await load()}}}}}
            }else{
                LifeCard(value["vehicle"]["name"].string){vehicleCard(value["vehicleSummary"]);Text(value["vehicle"]["notes"].string);HStack{writeButton("Edit vehicle","vehicle.save","garage.edit",input:value["vehicle"].object);writeButton("Add task","task.add","garage.add",input:["vehicle_id":.string(vehicleID)])}}
                LifeCard("Maintenance"){taskRows(value["tasks"].array)}
                LifeCard("Service history"){ForEach(value["services"].array,id:\.self){service in VStack(alignment:.leading,spacing:5){Text(service["title"].string.isEmpty ? service["service_type"].string : service["title"].string).font(.headline);Text(service["occurred_on"].string);Text(service["notes"].string);ForEach(service["parts"].array,id:\.self){part in Text(part["name"].string+" · "+part["part_number"].string+" · qty "+lifeNumber(part["quantity"])+" · $"+lifeNumber(part["cost"])).font(.caption)};if !service["odometer"].string.isEmpty || service["odometer"] != .null{Text(lifeNumber(service["odometer"])+" miles").font(.caption)}};Divider()};writeButton("Record service","capture.save","garage.add",input:["vehicle_id":.string(vehicleID),"kind":.string("service")])}
                LifeCard("Oil analysis"){ForEach(value["oilAnalyses"].array,id:\.self){capture in oilCard(capture);Divider()};writeButton("Add oil analysis","capture.save","garage.add",input:["vehicle_id":.string(vehicleID),"kind":.string("oil_analysis")])}
            }
        }
    }
    @ViewBuilder private func vehicleCard(_ card:JSON)->some View{
        let vehicle=card["vehicle"]
        Text([lifeNumber(vehicle["year"],missing:""),vehicle["kind"].string,vehicle["fuel_type"].string].filter{!$0.isEmpty}.joined(separator:" · ")).font(.subheadline).foregroundStyle(.secondary)
        HStack{LifeMetric("Services",value:lifeNumber(card["historyCount"]));LifeMetric("Open tasks",value:lifeNumber(card["openTaskCount"]));LifeMetric("MPG",value:lifeNumber(card["report"]["weightedMpg"]))}
        if card["latestObservation"] != .null{Text("Last odometer: "+lifeNumber(card["latestObservation"]["miles"])+" miles · "+card["latestObservation"]["date"].string).font(.caption).foregroundStyle(.secondary)}
    }
    @ViewBuilder private func taskRows(_ tasks:[JSON])->some View{
        if tasks.isEmpty{Text("No maintenance tasks.").foregroundStyle(.secondary)}
        ForEach(tasks,id:\.self){task in HStack{VStack(alignment:.leading){Text(task["title"].string).font(.headline);Text(task["notes"].string).font(.caption);Text([task["due_on"].string,task["due_odometer"] == .null ? "" : lifeNumber(task["due_odometer"])+" miles",task["status"].string].filter{!$0.isEmpty}.joined(separator:" · ")).font(.caption).foregroundStyle(.secondary)};Spacer();if !["completed","done"].contains(task["status"].string){writeButton("Complete","task.complete","garage.edit",input:["id":task["id"]])}}}
    }
    private var fuel:some View{
        Group{
            LifeCard("Fuel & mileage"){vehiclePicker;writeButton("Add fuel receipt","capture.save","garage.add",input:["kind":.string("fuel"),"vehicle_id":.string(vehicleID)])}
            LifeCard("Fuel economy"){
                HStack{LifeMetric("Weighted MPG",value:lifeNumber(value["report"]["weightedMpg"]));LifeMetric("Eligible miles",value:lifeNumber(value["report"]["eligibleMiles"]));LifeMetric("Eligible gallons",value:lifeNumber(value["report"]["eligibleGallons"]))}
                Text("Full-tank intervals only. Partial or missing fills remain pending.").font(.caption).foregroundStyle(.secondary)
            }
            LifeCard("Mileage estimates"){
                Text("Estimated from odometer observations; not exact monthly driving totals.").font(.caption).foregroundStyle(.secondary)
                ForEach(value["report"]["monthlyEstimates"].array,id:\.self){item in LabeledContent(item["month"].string,value:lifeNumber(item["miles"])+" miles")}
                ForEach(value["report"]["yearlyEstimates"].array,id:\.self){item in LabeledContent(lifeNumber(item["year"]),value:lifeNumber(item["miles"])+" miles")}
            }
            LifeCard("Full-tank intervals"){ForEach(value["report"]["intervals"].array,id:\.self){interval in VStack(alignment:.leading){Text(interval["from"].string+" – "+interval["to"].string).font(.subheadline);Text(lifeNumber(interval["miles"])+" miles · "+lifeNumber(interval["gallons"])+" gallons · "+lifeNumber(interval["mpg"])+" MPG").font(.caption)};Divider()}}
            LifeCard("Fills"){ForEach(value["fills"].array,id:\.self){fill in VStack(alignment:.leading,spacing:5){Text(fill["filled_at"].string).font(.headline);Text(lifeNumber(fill["gallons"])+" gallons · $"+lifeNumber(fill["total_cost"])+" · "+lifeNumber(fill["odometer"])+" miles");Text(lifeBool(fill["full_tank"]) ? "Full tank" : "Partial fill").font(.caption);if lifeBool(fill["missed_fill"]){Text("Missing fill in interval").font(.caption).foregroundStyle(.orange)};Text(fill["notes"].string).font(.caption)};Divider()}}
            LifeCard("Odometer readings"){ForEach(value["readings"].array,id:\.self){reading in LabeledContent(reading["observed_on"].string,value:lifeNumber(reading["miles"])+" miles")};writeButton("Record odometer","capture.save","garage.add",input:["kind":.string("odometer"),"vehicle_id":.string(vehicleID)])}
        }
    }
    private var captures:some View{
        Group{
            LifeCard("Review evidence"){
                Picker("Status",selection:$captureStatus){Text("Needs review").tag("review");Text("Saved").tag("saved");Text("All").tag("")}.onChange(of:captureStatus){_,_ in page=1;captureID="";Task{await load()}}
                writeButton("Add evidence","capture.save","garage.add")
                if !captureID.isEmpty{Button("Back to evidence list"){captureID="";Task{await load()}}}
            }
            if !captureID.isEmpty,value["capture"] != .null{
                let capture=value["capture"]
                LifeCard(capture["title"].string){Text(capture["kind"].string.capitalized+" · "+capture["status"].string);Text(capture["notes"].string);if capture["kind"].string=="oil_analysis"{oilCard(capture)}else{payloadRows(capture["payload"])}
                    ForEach(capture["uncertainties"].array,id:\.self){Text($0.string).foregroundStyle(.orange)}
                    HStack{if capture["status"].string != "saved" || capture["kind"].string == "oil_analysis"{writeButton("Edit","capture.save","garage.edit",input:capture.object)};if capture["status"].string != "saved"{writeButton("Accept reviewed record","capture.accept","garage.edit",input:["id":capture["id"],"vehicle_id":capture["vehicle_id"]])}}
                }
                if capture["status"].string == "saved" && capture["kind"].string != "oil_analysis"{Text("Accepted records are locked. Add new evidence to record a correction.").font(.caption).foregroundStyle(.secondary)}
                LifeCard("Attachments"){
                    attachmentRows(value["attachments"].array)
                    Button(uploading ? "Uploading…" : "Attach original file"){importing=true}.disabled(!allowed("garage.add") || uploading)
                }
            }else{
                ForEach(value["captures"].array,id:\.self){capture in LifeCard(capture["title"].string){Text(capture["kind"].string.capitalized+" · "+capture["status"].string).font(.caption);Text(capture["notes"].string).lineLimit(3);Button("Review details"){captureID=lifeID(capture["id"]);Task{await load()}}}}
                HStack{Button("Previous"){page=max(1,page-1);Task{await load()}}.disabled(page==1);Spacer();Text("Page \(page)");Spacer();Button("Next"){page += 1;Task{await load()}}.disabled(!value["hasMore"].bool)}
            }
        }
    }
    @ViewBuilder private func attachmentRows(_ items:[JSON])->some View{if items.isEmpty{Text("No attached evidence.").foregroundStyle(.secondary)};ForEach(items,id:\.self){item in Button{evidence=LifeEvidence(id:lifeID(item["id"]),name:item["original_name"].string.isEmpty ? item["name"].string : item["original_name"].string)}label:{Label(item["original_name"].string.isEmpty ? item["name"].string : item["original_name"].string,systemImage:"doc")}}}
    @ViewBuilder private func oilCard(_ capture:JSON)->some View{
        let payload=capture["payload"]
        Text(capture["title"].string).font(.headline)
        Text(payload["analysis_status"].string.replacingOccurrences(of:"_",with:" ").capitalized).font(.subheadline)
        Text([payload["lab"].string,payload["sample_date"].string,payload["report_number"].string].filter{!$0.isEmpty}.joined(separator:" · ")).font(.caption).foregroundStyle(.secondary)
        Text(payload["collection_notes"].string);Text(payload["lab_comments"].string)
        ForEach(payload["measurements"].array,id:\.self){measurement in VStack(alignment:.leading){LabeledContent(measurement["name"].string,value:lifeNumber(measurement["value"])+" "+measurement["unit"].string);Text("Reference: "+lifeNumber(measurement["reference"])+" · Unit avg: "+lifeNumber(measurement["unit_average"])+" · Universal avg: "+lifeNumber(measurement["universal_average"])).font(.caption2).foregroundStyle(.secondary)}}
        attachmentRows(capture["attachments"].array)
    }
    @ViewBuilder private func payloadRows(_ payload:JSON)->some View{ForEach(payload.object.keys.sorted(),id:\.self){key in let item=payload[key];if case .array = item{EmptyView()}else if case .object = item{EmptyView()}else{LabeledContent(key.replacingOccurrences(of:"_",with:" ").capitalized,value:lifeNumber(item))}}}
    private var security:some View{
        Group{
            LifeCard("Account"){
                Text(value["user"]["name"].string).font(.headline);Text(value["user"]["email"].string)
                Text(value["user"]["twoFactorEnabled"].bool ? "Authenticator enabled" : "Authenticator not reported enabled").font(.caption)
                Link("Manage sign-in and recovery on website",destination:URL(string:life.website+"/security")!)
            }
            LifeCard("Members"){ForEach(value["members"].array,id:\.self){member in LabeledContent(member["name"].string,value:member["role"].string)}}
            LifeCard("Passkeys"){ForEach(value["passkeys"].array,id:\.self){key in VStack(alignment:.leading){Text(key["name"].string);Text("Last used: "+key["last_used_at"].string).font(.caption).foregroundStyle(.secondary)}}}
            LifeCard("Audit history"){auditRows(value["audit"].array)}
        }
    }
    private var connections:some View{
        Group{
            LifeCard("Connections"){
                Text("These integrations belong to your website account. Desktop AI providers and pairings remain separate.").foregroundStyle(.secondary)
                Link("Manage connections on website",destination:URL(string:life.website+"/connections")!)
            }
            LifeCard("Access tokens"){ForEach(value["tokens"].array,id:\.self){token in VStack(alignment:.leading,spacing:4){Text(token["name"].string).font(.headline);Text(token["scopes"].array.map(\.string).joined(separator:", ")).font(.caption);Text(lifeBool(token["revoked"]) ? "Revoked" : "Expires "+token["expires_at"].string).font(.caption).foregroundStyle(.secondary)}}}
            LifeCard("Connected clients"){ForEach(value["clients"].array,id:\.self){client in LabeledContent(client["name"].string,value:lifeBool(client["revoked"]) ? "Revoked" : "Authorized")}}
            Text("Security-sensitive revocation requires verification on the website.").font(.footnote).foregroundStyle(.secondary)
        }
    }
    @ViewBuilder private func auditRows(_ rows:[JSON])->some View{if rows.isEmpty{Text("No recent activity.").foregroundStyle(.secondary)};ForEach(rows,id:\.self){row in VStack(alignment:.leading){Text(row["action"].string.replacingOccurrences(of:"_",with:" "));Text(row["created_at"].string).font(.caption).foregroundStyle(.secondary)}}}
}

struct LifeCard<Content:View>:View{
    let title:String;@ViewBuilder let content:()->Content
    init(_ title:String,@ViewBuilder content:@escaping()->Content){self.title=title;self.content=content}
    var body:some View{VStack(alignment:.leading,spacing:12){if !title.isEmpty{Text(title).font(.headline)};content()}.frame(maxWidth:.infinity,alignment:.leading).padding(18).background(NativeTheme.surface,in:RoundedRectangle(cornerRadius:20))}
}
struct LifeMetric:View{let title:String;let value:String;init(_ title:String,value:String){self.title=title;self.value=value};var body:some View{VStack(alignment:.leading,spacing:4){Text(value).font(.title2.bold()).monospacedDigit();Text(title).font(.caption).foregroundStyle(.secondary)}.frame(maxWidth:.infinity,alignment:.leading).padding(10)}}
struct LifeMacros:View{let value:JSON;var multiplier:Double=1;var body:some View{LazyVGrid(columns:[GridItem(.adaptive(minimum:130))],alignment:.leading){ForEach([("calories","Calories"),("protein","Protein, g"),("carbs","Carbs, g"),("fat","Fat, g")],id:\.0){key,label in LifeMetric(label,value:lifeDouble(value[key]).map{($0*multiplier).formatted(.number.precision(.fractionLength(0...1)))} ?? "—")}}}}
func lifeBool(_ value:JSON)->Bool{value.bool || value == .number(1) || value == .string("1")}
func lifeDouble(_ value:JSON)->Double?{if case .number(let n)=value,n.isFinite{return n};if let n=Double(value.string),n.isFinite{return n};return nil}
func lifeNumber(_ value:JSON,missing:String="—")->String{if let number=lifeDouble(value){return number.formatted(.number.precision(.fractionLength(0...1)))};if case .bool(let flag)=value{return flag ? "Yes" : "No"};return value.string.isEmpty ? missing : value.string}
func lifeID(_ value:JSON)->String{if case .number(let n)=value,n.isFinite{return String(format:"%.0f",n)};return value.string}

private struct LifeEvidenceView:View{
    @EnvironmentObject var life:LifeStore
    @Environment(\.dismiss) private var dismiss
    let item:LifeEvidence
    @State private var data:Data?
    @State private var mime=""
    @State private var failure:String?
    private static func raster(_ data:Data)->Bool{
        data.starts(with:[0xff,0xd8,0xff]) || data.starts(with:[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]) || (data.count>12 && String(data:data[4..<12],encoding:.ascii).map{["ftypheic","ftypheix","ftyphevc","ftypmif1"].contains($0)}==true) || (data.starts(with:Data("RIFF".utf8)) && data.count>12 && data[8..<12]==Data("WEBP".utf8))
    }
    var body:some View{
        Group{
            if let failure{ContentUnavailableView("Evidence unavailable",systemImage:"doc",description:Text(failure))}
            else if let data{
                if Self.raster(data),let image=UIImage(data:data){BackdropImagePreview(image:image,imageLabel:"Evidence image preview"){dismiss()}}
                else if data.starts(with:Data("%PDF-".utf8)){LifePDF(data:data)}
                else{ContentUnavailableView("Preview unavailable",systemImage:"doc",description:Text("This file type can be downloaded from the website. HTML and executable previews are disabled."));Link("Open evidence on website",destination:URL(string:life.website+"/attachments/"+item.id)!)}
            }else{ProgressView("Loading evidence…")}
        }.background(NativeTheme.background).navigationTitle(item.name).navigationBarTitleDisplayMode(.inline).toolbar{ToolbarItem(placement:.cancellationAction){Button("Done"){dismiss()}}}
            .task{do{let result=try await life.evidence(item.id);data=result.0;mime=result.1}catch{failure=life.display(error)}}
    }
}
private struct LifePDF:UIViewRepresentable{let data:Data;func makeUIView(context:Context)->PDFView{let view=PDFView();view.autoScales=true;view.document=PDFDocument(data:data);return view};func updateUIView(_ view:PDFView,context:Context){}}
