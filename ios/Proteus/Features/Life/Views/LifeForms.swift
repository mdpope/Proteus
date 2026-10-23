import SwiftUI

struct LifeField:Identifiable {
    let key:String;let label:String;var type="text";var required=false;var options:[String]=[]
    var id:String{key}
}
struct LifeDetailRow:Identifiable {var id=UUID();var values:[String:String]=[:]}
struct LifeForm:View {
    @EnvironmentObject var life:LifeStore
    @Environment(\.dismiss) private var dismiss
    let action:String;let initial:[String:JSON];let choices:JSON;let saved:()async->Void
    @State private var values:[String:String]
    @State private var rows:[LifeDetailRow]
    @State private var key=UUID().uuidString
    @State private var busy=false
    @State private var failure:String?
    init(action:String,initial:[String:JSON],choices:JSON,saved:@escaping()async->Void) {
        self.action=action;self.initial=initial;self.choices=choices;self.saved=saved
        var v=initial.mapValues(Self.raw)
        for (key,value) in initial["payload"]?.object ?? [:]{v["payload."+key]=Self.raw(value)}
        v["kind"]=v["kind"]?.isEmpty==false ? v["kind"] : "receipt"
        for (key,value) in ["meal":"snack","qty":"1","unit":"serving","source_type":"manual","serving":"1 serving","date":Self.format(Date(),datetime:false),"payload.date_precision":"day","payload.analysis_status":"awaiting_mailing","payload.fuel_type":"gas","payload.full_tank":"1"] {if v[key]==nil{v[key]=value}}
        if action=="vehicle.save",initial["kind"]==nil{v["kind"]="car";v["fuel_type"]="gas"}
        v["uncertainties"]=initial["uncertainties"]?.array.map(\.string).joined(separator:"\n") ?? ""
        _values=State(initialValue:v)
        let field=v["kind"]=="oil_analysis" ? "measurements":"parts"
        _rows=State(initialValue:initial["payload"]?[field].array.map{LifeDetailRow(values:$0.object.mapValues(Self.raw))} ?? [])
    }
    private static func raw(_ value:JSON)->String{if case .bool(let b)=value{return b ? "1":"0"};if case .number(let n)=value{return n.rounded()==n ? String(format:"%.0f",n) : String(n)};return value.string}
    private var confirm:Bool{["meal.delete","task.complete","capture.accept"].contains(action)}
    private var title:String{["food.save":"Save food","meal.log":"Log meal","meal.update":"Edit meal","meal.delete":"Delete meal","vehicle.save":"Save vehicle","task.add":"Maintenance task","task.complete":"Complete task","capture.save":"Evidence details","capture.accept":"Accept reviewed record"][action] ?? "Save record"}
    private var fields:[LifeField] {
        switch action {
        case "food.save":return [.init(key:"name",label:"Food name",required:true),.init(key:"serving",label:"Serving",required:true)]+["calories","protein","carbs","fat"].map{LifeField(key:$0,label:$0.capitalized,type:"number",required:true)}+[.init(key:"source_type",label:"Source",type:"choice",options:["manual","label","reference","estimate"]),.init(key:"source_note",label:"Source note",type:"long"),.init(key:"is_estimate",label:"Estimated nutrition",type:"bool")]
        case "meal.log","meal.update":return [.init(key:"food_id",label:"Food",type:"food",required:true),.init(key:"date",label:"Date",type:"date",required:true),.init(key:"meal",label:"Meal",type:"choice",options:["breakfast","lunch","dinner","snack"]),.init(key:"qty",label:"Quantity",type:"number",required:true),.init(key:"unit",label:"Unit"),.init(key:"note",label:"Note",type:"long")]
        case "vehicle.save":return [.init(key:"name",label:"Name",required:true),.init(key:"kind",label:"Type",type:"choice",options:["car","truck","suv","van","motorcycle","trailer","other"]),.init(key:"fuel_type",label:"Fuel",type:"choice",options:["gas","diesel","electric","hybrid","other"]),.init(key:"year",label:"Year",type:"number"),.init(key:"vin",label:"VIN"),.init(key:"notes",label:"Notes",type:"long")]
        case "task.add":return [.init(key:"vehicle_id",label:"Vehicle",type:"vehicle",required:true),.init(key:"title",label:"Task",required:true),.init(key:"due_on",label:"Due date · YYYY-MM-DD"),.init(key:"due_odometer",label:"Due odometer, miles",type:"number"),.init(key:"notes",label:"Notes",type:"long")]
        case "capture.save":return [.init(key:"kind",label:"Record type",type:"choice",options:["receipt","service","fuel","odometer","oil_analysis","document"]),.init(key:"vehicle_id",label:"Vehicle",type:"vehicle"),.init(key:"title",label:"Title",required:true)]+captureFields+[.init(key:"notes",label:"Notes",type:"long"),.init(key:"uncertainties",label:"Uncertainties · one per line",type:"long")]
        default:return []
        }
    }
    private var captureFields:[LifeField] {
        func f(_ key:String,_ label:String,_ type:String="text",_ options:[String]=[])->LifeField{.init(key:"payload."+key,label:label,type:type,options:options)}
        switch values["kind"] {
        case "fuel":return [f("filled_at","Date and time","datetime"),f("odometer","Odometer, miles","number"),f("gallons","US gallons","number"),f("total_cost","Total cost, USD","number"),f("price_per_gallon","Price per gallon, USD","number"),f("fuel_type","Fuel","choice",["gas","diesel","other"]),f("full_tank","Filled to full","bool"),f("missed_fill","Missing fill-ups before this one","bool"),f("station","Station"),f("trip_miles","Trip distance, miles","number"),f("dashboard_mpg","Dashboard MPG","number")]
        case "odometer":return [f("observed_on","Observation date","date"),f("miles","Odometer, miles","number")]
        case "oil_analysis":return [f("analysis_status","Sample status","choice",["awaiting_mailing","submitted","reported"]),f("lab","Lab"),f("sample_date","Sample date","date"),f("report_date","Report date · YYYY-MM-DD"),f("report_number","Report number"),f("order_number","Order number"),f("unit_id","Lab unit ID"),f("engine","Engine"),f("oil_type","Oil type"),f("comparison_miles","Comparison miles","number"),f("makeup_quarts","Make-up oil, quarts","number"),f("odometer","Odometer, miles","number"),f("oil_miles","Miles on oil","number"),f("collection_notes","Collection notes","long"),f("lab_comments","Lab comments","long")]
        case "receipt","service":return [f("occurred_on","Date · YYYY-MM-DD"),f("date_precision","Date precision","choice",["day","month","year","unknown"]),f("odometer","Odometer, miles","number"),f("odometer_approximate","Approximate odometer","bool"),f("cost","Cost, USD","number"),f("vendor","Vendor or shop")]
        default:return []
        }
    }
    var body:some View {
        NativeForm {
            if confirm {Section{Text(action=="meal.delete" ? "Delete this meal entry? The food and its version history remain." : action=="capture.accept" ? "Accept these saved details into history only after reviewing the original evidence and resolving uncertainties." : "Mark this maintenance task complete?")}}
            else {
                Section{ForEach(fields){field in input(field)}}
                if action=="capture.save" && ["receipt","service","oil_analysis"].contains(values["kind"] ?? "") {
                    Section(values["kind"]=="oil_analysis" ? "Lab measurements":"Parts") {
                        ForEach($rows){$row in
                            VStack(alignment:.leading) {
                                ForEach(rowKeys,id:\.self){name in TextField(name.replacingOccurrences(of:"_",with:" ").capitalized,text:Binding(get:{row.values[name] ?? ""},set:{row.values[name]=$0;key=UUID().uuidString}))}
                                Button("Remove row",role:.destructive){rows.removeAll{$0.id==row.id};key=UUID().uuidString}
                            }
                        }
                        Button("Add row"){rows.append(LifeDetailRow());key=UUID().uuidString}
                    }
                }
            }
            if action=="capture.save"{Section{Text("Save details for review, then attach the original file. Saving does not automatically accept the record into history.").font(.footnote).foregroundStyle(.secondary)}}
            if let failure{Text(failure).foregroundStyle(.orange).accessibilityIdentifier("life-form-error")}
            if busy{ProgressView("Saving…")}
        }.background(NativeTheme.background).navigationTitle(title).navigationBarTitleDisplayMode(.inline)
            .toolbar{ToolbarItem(placement:.cancellationAction){Button("Cancel"){dismiss()}.disabled(busy)};ToolbarItem(placement:.confirmationAction){Button(confirm ? "Confirm":"Save"){Task{await submit()}}.disabled(busy || life.readOnly).accessibilityIdentifier("life-save-record")}}
            .interactiveDismissDisabled(busy)
            .onChange(of:values["kind"]){_,_ in if action=="capture.save"{rows=[]};key=UUID().uuidString}
    }
    private var rowKeys:[String]{values["kind"]=="oil_analysis" ? ["name","value","unit","reference","unit_average","universal_average"] : ["name","part_number","quantity","cost"]}
    private func binding(_ name:String)->Binding<String>{Binding(get:{values[name] ?? ""},set:{values[name]=$0;key=UUID().uuidString})}
    @ViewBuilder private func input(_ field:LifeField)->some View {
        switch field.type {
        case "bool":Toggle(field.label,isOn:Binding(get:{values[field.key]=="1"},set:{values[field.key]=$0 ? "1":"0";key=UUID().uuidString}))
        case "choice":Picker(field.label,selection:binding(field.key)){ForEach(field.options,id:\.self){Text($0.replacingOccurrences(of:"_",with:" ").capitalized).tag($0)}}
        case "food","vehicle":Picker(field.label,selection:binding(field.key)){Text("Choose \(field.type)").tag("");ForEach(choices[field.type=="food" ? "foods":"vehicles"].array,id:\.self){item in Text(item["name"].string).tag(lifeID(item["id"]))}}
        case "long":VStack(alignment:.leading){Text(field.label).font(.caption).foregroundStyle(.secondary);TextEditor(text:binding(field.key)).frame(minHeight:80)}
        case "date","datetime":DatePicker(field.label,selection:Binding(get:{Self.parse(values[field.key] ?? "",datetime:field.type=="datetime") ?? Date()},set:{values[field.key]=Self.format($0,datetime:field.type=="datetime");key=UUID().uuidString}),displayedComponents:field.type=="datetime" ? [.date,.hourAndMinute]:[.date]).onAppear{if values[field.key]?.isEmpty != false{values[field.key]=Self.format(Date(),datetime:field.type=="datetime")}}
        default:TextField(field.label+(field.required ? " *":""),text:binding(field.key)).keyboardType(field.type=="number" ? .decimalPad:.default).autocorrectionDisabled(field.type=="number")
        }
    }
    private static func format(_ value:Date,datetime:Bool)->String{let f=DateFormatter();f.locale=Locale(identifier:"en_US_POSIX");f.dateFormat=datetime ? "yyyy-MM-dd'T'HH:mm":"yyyy-MM-dd";return f.string(from:value)}
    private static func parse(_ value:String,datetime:Bool)->Date?{let f=DateFormatter();f.locale=Locale(identifier:"en_US_POSIX");f.dateFormat=datetime ? "yyyy-MM-dd'T'HH:mm":"yyyy-MM-dd";return f.date(from:String(value.replacingOccurrences(of:" ",with:"T").prefix(datetime ? 16:10)))}
    private func submit()async {
        guard !busy else{return};busy=true;defer{busy=false};failure=nil
        do {
            var result:[String:JSON]=[:]
            for id in ["id","food_id"]{if let value=initial[id],value != .null{result[id]=value}}
            if confirm{result=initial.filter{["id","vehicle_id"].contains($0.key)}}
            else {
                var payload:[String:JSON]=[:]
                for field in fields {
                    let text=(values[field.key] ?? "").trimmingCharacters(in:.whitespacesAndNewlines)
                    if field.required && text.isEmpty{throw RemoteError(message:"Enter \(field.label.lowercased()).")}
                    if text.isEmpty{if ["notes","note","vin","source_note","due_on","due_odometer"].contains(field.key){result[field.key] = .null};continue}
                    let value:JSON
                    if field.key=="uncertainties"{value = .array(text.split(separator:"\n").map{.string(String($0))})}
                    else if field.type=="bool"{value = .bool(text=="1")}
                    else if field.type=="number"{guard let n=Double(text),n.isFinite,n>=0 else{throw RemoteError(message:"Enter a valid nonnegative number for \(field.label.lowercased()).")};value = .number(n)}
                    else{value = .string(text)}
                    if field.key.hasPrefix("payload."){payload[String(field.key.dropFirst(8))]=value}else{result[field.key]=value}
                }
                if action=="capture.save" {
                    let kind=values["kind"] ?? "receipt"
                    if ["receipt","service","oil_analysis"].contains(kind) {
                        payload[kind=="oil_analysis" ? "measurements":"parts"] = .array(try rows.map{row in
                            var item:[String:JSON]=[:]
                            for name in rowKeys{let text=(row.values[name] ?? "").trimmingCharacters(in:.whitespacesAndNewlines);if text.isEmpty{continue};if ["quantity","cost"].contains(name){guard let n=Double(text),n.isFinite,n>=0 else{throw RemoteError(message:"Enter a valid part quantity or cost.")};item[name] = .number(n)}else{item[name] = .string(text)}}
                            guard item["name"]?.string.isEmpty==false else{throw RemoteError(message:"Name each measurement or part, or remove its empty row.")};return .object(item)
                        })
                    }
                    result["payload"] = .object(payload);result["uncertainties"] = result["uncertainties"] ?? .array([])
                }
            }
            _ = try await life.action(action,input:result,idempotencyKey:key);await saved();dismiss()
        }catch{failure=life.display(error)}
    }
}
