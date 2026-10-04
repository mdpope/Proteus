import test from 'node:test';
import assert from 'node:assert/strict';
import {nutritionReport, latestObservation} from '../src/life-reports.js';
const day=(date,value=100)=>['Breakfast','lunch','DINNER'].map(meal=>({date,meal,qty:1,calories:value,protein:10,carbs:20,fat:3,food_name:'Recorded food'}));
test('fixed nutrition windows use complete days, historical values and inclusive calendar dates',()=>{
 const entries=[...day('2024-02-01',100),...day('2024-02-29',200),...day('2024-03-01',300),{...day('2024-02-29')[0],meal:'snack',qty:2,calories:50},day('2024-02-15')[0],{...day('2024-02-29')[0],calories:999,deleted_at:'removed'}];
 const r=nutritionReport(entries,{instant:'2024-03-01T06:30:00Z',timezone:'America/Denver',from:'2024-02-15',through:'2024-02-29'});
 assert.equal(r.reportDate,'2024-02-29');assert.equal(r.periodSummaries[1].calendarDays,29);assert.equal(r.periodSummaries[2].from,'2024-01-31');assert.equal(r.periodSummaries[2].calendarDays,30);
 assert.equal(r.periodSummaries[1].completeDays,2);assert.equal(r.periodSummaries[1].calories,500);assert.equal(r.periodSummaries[1].entryCount,7);assert.equal(r.periodSummaries[1].partialDays,1);assert.equal(r.periodSummaries[1].unloggedDays,26);
 assert.equal(r.averages.days,1);assert.equal(r.averages.calories,700);assert.equal(r.days.length,2);assert.equal(r.monthly[0].caloriesTotal,700);assert.equal(r.periodSummaries[0].completeDays,3);
});
test('calendar windows survive DST and zero-valued skipped meals are complete',()=>{
 const r=nutritionReport(day('2026-03-08',0),{instant:'2026-03-09T05:30:00Z',timezone:'America/Denver'});
 assert.equal(r.reportDate,'2026-03-08');assert.equal(r.periodSummaries[2].from,'2026-02-07');assert.equal(r.periodSummaries[2].calendarDays,30);assert.equal(r.periodSummaries[2].calories,0);
 const empty=nutritionReport([day('2026-03-08')[0]],{instant:'2026-03-09T05:30:00Z',timezone:'America/Denver'});assert.equal(empty.averages.calories,null);assert.equal(empty.averages.days,0);
});
test('invalid dates, timezone, reversed bounds fail explicitly',()=>{
 for(const options of [{from:'2025-02-29'},{from:'2026-10-02',through:'2026-10-01'},{timezone:'not/a-zone'}])assert.throws(()=>nutritionReport([],options));
});
test('latest mileage excludes approximate dates/readings and chooses highest same-date observation',()=>{
 assert.deepEqual(latestObservation([{filled_at:'2026-01-01 12:00:00',odometer:100}], [{observed_on:'2026-01-02',miles:200}], [{occurred_on:'2026-02-01',odometer:1000,date_precision:'month'}, {occurred_on:'2026-01-02',odometer:300,date_precision:'day',odometer_approximate:0}]),{date:'2026-01-02',miles:300});
});
