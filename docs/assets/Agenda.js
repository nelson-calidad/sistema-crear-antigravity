import{r as W,j as s}from"./index.js";import{c as xe,g as ye,R as $,u as Je,e as Ke,a as S,f as Ze,h as et,U as tt,i as at,C as rt,m as nt}from"./App.js";import{P as st}from"./plus.js";/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const it=[["path",{d:"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",key:"1r0f0z"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}]],ot=xe("map-pin",it);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dt=[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]],ue=xe("printer",dt);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lt=[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]],ct=xe("refresh-cw",lt),Ce=6048e5,ut=864e5,je=Symbol.for("constructDateFrom");function F(e,t){return typeof e=="function"?e(t):e&&typeof e=="object"&&je in e?e[je](t):e instanceof Date?new e.constructor(t):new Date(t)}function T(e,t){return F(t||e,e)}function Ee(e,t,a){const r=T(e,a==null?void 0:a.in);return isNaN(t)?F(e,NaN):(t&&r.setDate(r.getDate()+t),r)}let mt={};function U(){return mt}function H(e,t){var h,f,u,m;const a=U(),r=(t==null?void 0:t.weekStartsOn)??((f=(h=t==null?void 0:t.locale)==null?void 0:h.options)==null?void 0:f.weekStartsOn)??a.weekStartsOn??((m=(u=a.locale)==null?void 0:u.options)==null?void 0:m.weekStartsOn)??0,n=T(e,t==null?void 0:t.in),o=n.getDay(),c=(o<r?7:0)+o-r;return n.setDate(n.getDate()-c),n.setHours(0,0,0,0),n}function ne(e,t){return H(e,{...t,weekStartsOn:1})}function Ie(e,t){const a=T(e,t==null?void 0:t.in),r=a.getFullYear(),n=F(a,0);n.setFullYear(r+1,0,4),n.setHours(0,0,0,0);const o=ne(n),c=F(a,0);c.setFullYear(r,0,4),c.setHours(0,0,0,0);const h=ne(c);return a.getTime()>=o.getTime()?r+1:a.getTime()>=h.getTime()?r:r-1}function Me(e){const t=T(e),a=new Date(Date.UTC(t.getFullYear(),t.getMonth(),t.getDate(),t.getHours(),t.getMinutes(),t.getSeconds(),t.getMilliseconds()));return a.setUTCFullYear(t.getFullYear()),+e-+a}function de(e,...t){const a=F.bind(null,t.find(r=>typeof r=="object"));return t.map(a)}function se(e,t){const a=T(e,t==null?void 0:t.in);return a.setHours(0,0,0,0),a}function ht(e,t,a){const[r,n]=de(a==null?void 0:a.in,e,t),o=se(r),c=se(n),h=+o-Me(o),f=+c-Me(c);return Math.round((h-f)/ut)}function ft(e,t){const a=Ie(e,t),r=F(e,0);return r.setFullYear(a,0,4),r.setHours(0,0,0,0),ne(r)}function re(e,t,a){const[r,n]=de(a==null?void 0:a.in,e,t);return+se(r)==+se(n)}function gt(e){return e instanceof Date||typeof e=="object"&&Object.prototype.toString.call(e)==="[object Date]"}function bt(e){return!(!gt(e)&&typeof e!="number"||isNaN(+T(e)))}function Ye(e,t){const a=T(e,t==null?void 0:t.in),r=a.getMonth();return a.setFullYear(a.getFullYear(),r+1,0),a.setHours(23,59,59,999),a}function pt(e,t){const[a,r]=de(e,t.start,t.end);return{start:a,end:r}}function we(e,t){const{start:a,end:r}=pt(t==null?void 0:t.in,e);let n=+a>+r;const o=n?+a:+r,c=n?r:a;c.setHours(0,0,0,0);let h=1;const f=[];for(;+c<=o;)f.push(F(a,c)),c.setDate(c.getDate()+h),c.setHours(0,0,0,0);return n?f.reverse():f}function Fe(e,t){const a=T(e,t==null?void 0:t.in);return a.setDate(1),a.setHours(0,0,0,0),a}function xt(e,t){const a=T(e,t==null?void 0:t.in);return a.setFullYear(a.getFullYear(),0,1),a.setHours(0,0,0,0),a}function le(e,t){var h,f,u,m;const a=U(),r=(t==null?void 0:t.weekStartsOn)??((f=(h=t==null?void 0:t.locale)==null?void 0:h.options)==null?void 0:f.weekStartsOn)??a.weekStartsOn??((m=(u=a.locale)==null?void 0:u.options)==null?void 0:m.weekStartsOn)??0,n=T(e,t==null?void 0:t.in),o=n.getDay(),c=(o<r?-7:0)+6-(o-r);return n.setDate(n.getDate()+c),n.setHours(23,59,59,999),n}const yt={lessThanXSeconds:{one:"less than a second",other:"less than {{count}} seconds"},xSeconds:{one:"1 second",other:"{{count}} seconds"},halfAMinute:"half a minute",lessThanXMinutes:{one:"less than a minute",other:"less than {{count}} minutes"},xMinutes:{one:"1 minute",other:"{{count}} minutes"},aboutXHours:{one:"about 1 hour",other:"about {{count}} hours"},xHours:{one:"1 hour",other:"{{count}} hours"},xDays:{one:"1 day",other:"{{count}} days"},aboutXWeeks:{one:"about 1 week",other:"about {{count}} weeks"},xWeeks:{one:"1 week",other:"{{count}} weeks"},aboutXMonths:{one:"about 1 month",other:"about {{count}} months"},xMonths:{one:"1 month",other:"{{count}} months"},aboutXYears:{one:"about 1 year",other:"about {{count}} years"},xYears:{one:"1 year",other:"{{count}} years"},overXYears:{one:"over 1 year",other:"over {{count}} years"},almostXYears:{one:"almost 1 year",other:"almost {{count}} years"}},wt=(e,t,a)=>{let r;const n=yt[e];return typeof n=="string"?r=n:t===1?r=n.one:r=n.other.replace("{{count}}",t.toString()),a!=null&&a.addSuffix?a.comparison&&a.comparison>0?"in "+r:r+" ago":r};function X(e){return(t={})=>{const a=t.width?String(t.width):e.defaultWidth;return e.formats[a]||e.formats[e.defaultWidth]}}const vt={full:"EEEE, MMMM do, y",long:"MMMM do, y",medium:"MMM d, y",short:"MM/dd/yyyy"},kt={full:"h:mm:ss a zzzz",long:"h:mm:ss a z",medium:"h:mm:ss a",short:"h:mm a"},Nt={full:"{{date}} 'at' {{time}}",long:"{{date}} 'at' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},jt={date:X({formats:vt,defaultWidth:"full"}),time:X({formats:kt,defaultWidth:"full"}),dateTime:X({formats:Nt,defaultWidth:"full"})},Mt={lastWeek:"'last' eeee 'at' p",yesterday:"'yesterday at' p",today:"'today at' p",tomorrow:"'tomorrow at' p",nextWeek:"eeee 'at' p",other:"P"},St=(e,t,a,r)=>Mt[e];function E(e){return(t,a)=>{const r=a!=null&&a.context?String(a.context):"standalone";let n;if(r==="formatting"&&e.formattingValues){const c=e.defaultFormattingWidth||e.defaultWidth,h=a!=null&&a.width?String(a.width):c;n=e.formattingValues[h]||e.formattingValues[c]}else{const c=e.defaultWidth,h=a!=null&&a.width?String(a.width):e.defaultWidth;n=e.values[h]||e.values[c]}const o=e.argumentCallback?e.argumentCallback(t):t;return n[o]}}const $t={narrow:["B","A"],abbreviated:["BC","AD"],wide:["Before Christ","Anno Domini"]},Pt={narrow:["1","2","3","4"],abbreviated:["Q1","Q2","Q3","Q4"],wide:["1st quarter","2nd quarter","3rd quarter","4th quarter"]},Dt={narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],abbreviated:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],wide:["January","February","March","April","May","June","July","August","September","October","November","December"]},Tt={narrow:["S","M","T","W","T","F","S"],short:["Su","Mo","Tu","We","Th","Fr","Sa"],abbreviated:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],wide:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},Ot={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"}},Wt={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"}},Ct=(e,t)=>{const a=Number(e),r=a%100;if(r>20||r<10)switch(r%10){case 1:return a+"st";case 2:return a+"nd";case 3:return a+"rd"}return a+"th"},Et={ordinalNumber:Ct,era:E({values:$t,defaultWidth:"wide"}),quarter:E({values:Pt,defaultWidth:"wide",argumentCallback:e=>e-1}),month:E({values:Dt,defaultWidth:"wide"}),day:E({values:Tt,defaultWidth:"wide"}),dayPeriod:E({values:Ot,defaultWidth:"wide",formattingValues:Wt,defaultFormattingWidth:"wide"})};function I(e){return(t,a={})=>{const r=a.width,n=r&&e.matchPatterns[r]||e.matchPatterns[e.defaultMatchWidth],o=t.match(n);if(!o)return null;const c=o[0],h=r&&e.parsePatterns[r]||e.parsePatterns[e.defaultParseWidth],f=Array.isArray(h)?Yt(h,g=>g.test(c)):It(h,g=>g.test(c));let u;u=e.valueCallback?e.valueCallback(f):f,u=a.valueCallback?a.valueCallback(u):u;const m=t.slice(c.length);return{value:u,rest:m}}}function It(e,t){for(const a in e)if(Object.prototype.hasOwnProperty.call(e,a)&&t(e[a]))return a}function Yt(e,t){for(let a=0;a<e.length;a++)if(t(e[a]))return a}function Ae(e){return(t,a={})=>{const r=t.match(e.matchPattern);if(!r)return null;const n=r[0],o=t.match(e.parsePattern);if(!o)return null;let c=e.valueCallback?e.valueCallback(o[0]):o[0];c=a.valueCallback?a.valueCallback(c):c;const h=t.slice(n.length);return{value:c,rest:h}}}const Ft=/^(\d+)(th|st|nd|rd)?/i,At=/\d+/i,Ht={narrow:/^(b|a)/i,abbreviated:/^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,wide:/^(before christ|before common era|anno domini|common era)/i},Rt={any:[/^b/i,/^(a|c)/i]},qt={narrow:/^[1234]/i,abbreviated:/^q[1234]/i,wide:/^[1234](th|st|nd|rd)? quarter/i},zt={any:[/1/i,/2/i,/3/i,/4/i]},_t={narrow:/^[jfmasond]/i,abbreviated:/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,wide:/^(january|february|march|april|may|june|july|august|september|october|november|december)/i},Lt={narrow:[/^j/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^ja/i,/^f/i,/^mar/i,/^ap/i,/^may/i,/^jun/i,/^jul/i,/^au/i,/^s/i,/^o/i,/^n/i,/^d/i]},Bt={narrow:/^[smtwf]/i,short:/^(su|mo|tu|we|th|fr|sa)/i,abbreviated:/^(sun|mon|tue|wed|thu|fri|sat)/i,wide:/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i},Vt={narrow:[/^s/i,/^m/i,/^t/i,/^w/i,/^t/i,/^f/i,/^s/i],any:[/^su/i,/^m/i,/^tu/i,/^w/i,/^th/i,/^f/i,/^sa/i]},Xt={narrow:/^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,any:/^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i},Qt={any:{am:/^a/i,pm:/^p/i,midnight:/^mi/i,noon:/^no/i,morning:/morning/i,afternoon:/afternoon/i,evening:/evening/i,night:/night/i}},Gt={ordinalNumber:Ae({matchPattern:Ft,parsePattern:At,valueCallback:e=>parseInt(e,10)}),era:I({matchPatterns:Ht,defaultMatchWidth:"wide",parsePatterns:Rt,defaultParseWidth:"any"}),quarter:I({matchPatterns:qt,defaultMatchWidth:"wide",parsePatterns:zt,defaultParseWidth:"any",valueCallback:e=>e+1}),month:I({matchPatterns:_t,defaultMatchWidth:"wide",parsePatterns:Lt,defaultParseWidth:"any"}),day:I({matchPatterns:Bt,defaultMatchWidth:"wide",parsePatterns:Vt,defaultParseWidth:"any"}),dayPeriod:I({matchPatterns:Xt,defaultMatchWidth:"any",parsePatterns:Qt,defaultParseWidth:"any"})},Ut={code:"en-US",formatDistance:wt,formatLong:jt,formatRelative:St,localize:Et,match:Gt,options:{weekStartsOn:0,firstWeekContainsDate:1}};function Jt(e,t){const a=T(e,t==null?void 0:t.in);return ht(a,xt(a))+1}function Kt(e,t){const a=T(e,t==null?void 0:t.in),r=+ne(a)-+ft(a);return Math.round(r/Ce)+1}function He(e,t){var m,g,p,x;const a=T(e,t==null?void 0:t.in),r=a.getFullYear(),n=U(),o=(t==null?void 0:t.firstWeekContainsDate)??((g=(m=t==null?void 0:t.locale)==null?void 0:m.options)==null?void 0:g.firstWeekContainsDate)??n.firstWeekContainsDate??((x=(p=n.locale)==null?void 0:p.options)==null?void 0:x.firstWeekContainsDate)??1,c=F((t==null?void 0:t.in)||e,0);c.setFullYear(r+1,0,o),c.setHours(0,0,0,0);const h=H(c,t),f=F((t==null?void 0:t.in)||e,0);f.setFullYear(r,0,o),f.setHours(0,0,0,0);const u=H(f,t);return+a>=+h?r+1:+a>=+u?r:r-1}function Zt(e,t){var h,f,u,m;const a=U(),r=(t==null?void 0:t.firstWeekContainsDate)??((f=(h=t==null?void 0:t.locale)==null?void 0:h.options)==null?void 0:f.firstWeekContainsDate)??a.firstWeekContainsDate??((m=(u=a.locale)==null?void 0:u.options)==null?void 0:m.firstWeekContainsDate)??1,n=He(e,t),o=F((t==null?void 0:t.in)||e,0);return o.setFullYear(n,0,r),o.setHours(0,0,0,0),H(o,t)}function ea(e,t){const a=T(e,t==null?void 0:t.in),r=+H(a,t)-+Zt(a,t);return Math.round(r/Ce)+1}function y(e,t){const a=e<0?"-":"",r=Math.abs(e).toString().padStart(t,"0");return a+r}const q={y(e,t){const a=e.getFullYear(),r=a>0?a:1-a;return y(t==="yy"?r%100:r,t.length)},M(e,t){const a=e.getMonth();return t==="M"?String(a+1):y(a+1,2)},d(e,t){return y(e.getDate(),t.length)},a(e,t){const a=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return a.toUpperCase();case"aaa":return a;case"aaaaa":return a[0];case"aaaa":default:return a==="am"?"a.m.":"p.m."}},h(e,t){return y(e.getHours()%12||12,t.length)},H(e,t){return y(e.getHours(),t.length)},m(e,t){return y(e.getMinutes(),t.length)},s(e,t){return y(e.getSeconds(),t.length)},S(e,t){const a=t.length,r=e.getMilliseconds(),n=Math.trunc(r*Math.pow(10,a-3));return y(n,t.length)}},B={midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},Se={G:function(e,t,a){const r=e.getFullYear()>0?1:0;switch(t){case"G":case"GG":case"GGG":return a.era(r,{width:"abbreviated"});case"GGGGG":return a.era(r,{width:"narrow"});case"GGGG":default:return a.era(r,{width:"wide"})}},y:function(e,t,a){if(t==="yo"){const r=e.getFullYear(),n=r>0?r:1-r;return a.ordinalNumber(n,{unit:"year"})}return q.y(e,t)},Y:function(e,t,a,r){const n=He(e,r),o=n>0?n:1-n;if(t==="YY"){const c=o%100;return y(c,2)}return t==="Yo"?a.ordinalNumber(o,{unit:"year"}):y(o,t.length)},R:function(e,t){const a=Ie(e);return y(a,t.length)},u:function(e,t){const a=e.getFullYear();return y(a,t.length)},Q:function(e,t,a){const r=Math.ceil((e.getMonth()+1)/3);switch(t){case"Q":return String(r);case"QQ":return y(r,2);case"Qo":return a.ordinalNumber(r,{unit:"quarter"});case"QQQ":return a.quarter(r,{width:"abbreviated",context:"formatting"});case"QQQQQ":return a.quarter(r,{width:"narrow",context:"formatting"});case"QQQQ":default:return a.quarter(r,{width:"wide",context:"formatting"})}},q:function(e,t,a){const r=Math.ceil((e.getMonth()+1)/3);switch(t){case"q":return String(r);case"qq":return y(r,2);case"qo":return a.ordinalNumber(r,{unit:"quarter"});case"qqq":return a.quarter(r,{width:"abbreviated",context:"standalone"});case"qqqqq":return a.quarter(r,{width:"narrow",context:"standalone"});case"qqqq":default:return a.quarter(r,{width:"wide",context:"standalone"})}},M:function(e,t,a){const r=e.getMonth();switch(t){case"M":case"MM":return q.M(e,t);case"Mo":return a.ordinalNumber(r+1,{unit:"month"});case"MMM":return a.month(r,{width:"abbreviated",context:"formatting"});case"MMMMM":return a.month(r,{width:"narrow",context:"formatting"});case"MMMM":default:return a.month(r,{width:"wide",context:"formatting"})}},L:function(e,t,a){const r=e.getMonth();switch(t){case"L":return String(r+1);case"LL":return y(r+1,2);case"Lo":return a.ordinalNumber(r+1,{unit:"month"});case"LLL":return a.month(r,{width:"abbreviated",context:"standalone"});case"LLLLL":return a.month(r,{width:"narrow",context:"standalone"});case"LLLL":default:return a.month(r,{width:"wide",context:"standalone"})}},w:function(e,t,a,r){const n=ea(e,r);return t==="wo"?a.ordinalNumber(n,{unit:"week"}):y(n,t.length)},I:function(e,t,a){const r=Kt(e);return t==="Io"?a.ordinalNumber(r,{unit:"week"}):y(r,t.length)},d:function(e,t,a){return t==="do"?a.ordinalNumber(e.getDate(),{unit:"date"}):q.d(e,t)},D:function(e,t,a){const r=Jt(e);return t==="Do"?a.ordinalNumber(r,{unit:"dayOfYear"}):y(r,t.length)},E:function(e,t,a){const r=e.getDay();switch(t){case"E":case"EE":case"EEE":return a.day(r,{width:"abbreviated",context:"formatting"});case"EEEEE":return a.day(r,{width:"narrow",context:"formatting"});case"EEEEEE":return a.day(r,{width:"short",context:"formatting"});case"EEEE":default:return a.day(r,{width:"wide",context:"formatting"})}},e:function(e,t,a,r){const n=e.getDay(),o=(n-r.weekStartsOn+8)%7||7;switch(t){case"e":return String(o);case"ee":return y(o,2);case"eo":return a.ordinalNumber(o,{unit:"day"});case"eee":return a.day(n,{width:"abbreviated",context:"formatting"});case"eeeee":return a.day(n,{width:"narrow",context:"formatting"});case"eeeeee":return a.day(n,{width:"short",context:"formatting"});case"eeee":default:return a.day(n,{width:"wide",context:"formatting"})}},c:function(e,t,a,r){const n=e.getDay(),o=(n-r.weekStartsOn+8)%7||7;switch(t){case"c":return String(o);case"cc":return y(o,t.length);case"co":return a.ordinalNumber(o,{unit:"day"});case"ccc":return a.day(n,{width:"abbreviated",context:"standalone"});case"ccccc":return a.day(n,{width:"narrow",context:"standalone"});case"cccccc":return a.day(n,{width:"short",context:"standalone"});case"cccc":default:return a.day(n,{width:"wide",context:"standalone"})}},i:function(e,t,a){const r=e.getDay(),n=r===0?7:r;switch(t){case"i":return String(n);case"ii":return y(n,t.length);case"io":return a.ordinalNumber(n,{unit:"day"});case"iii":return a.day(r,{width:"abbreviated",context:"formatting"});case"iiiii":return a.day(r,{width:"narrow",context:"formatting"});case"iiiiii":return a.day(r,{width:"short",context:"formatting"});case"iiii":default:return a.day(r,{width:"wide",context:"formatting"})}},a:function(e,t,a){const n=e.getHours()/12>=1?"pm":"am";switch(t){case"a":case"aa":return a.dayPeriod(n,{width:"abbreviated",context:"formatting"});case"aaa":return a.dayPeriod(n,{width:"abbreviated",context:"formatting"}).toLowerCase();case"aaaaa":return a.dayPeriod(n,{width:"narrow",context:"formatting"});case"aaaa":default:return a.dayPeriod(n,{width:"wide",context:"formatting"})}},b:function(e,t,a){const r=e.getHours();let n;switch(r===12?n=B.noon:r===0?n=B.midnight:n=r/12>=1?"pm":"am",t){case"b":case"bb":return a.dayPeriod(n,{width:"abbreviated",context:"formatting"});case"bbb":return a.dayPeriod(n,{width:"abbreviated",context:"formatting"}).toLowerCase();case"bbbbb":return a.dayPeriod(n,{width:"narrow",context:"formatting"});case"bbbb":default:return a.dayPeriod(n,{width:"wide",context:"formatting"})}},B:function(e,t,a){const r=e.getHours();let n;switch(r>=17?n=B.evening:r>=12?n=B.afternoon:r>=4?n=B.morning:n=B.night,t){case"B":case"BB":case"BBB":return a.dayPeriod(n,{width:"abbreviated",context:"formatting"});case"BBBBB":return a.dayPeriod(n,{width:"narrow",context:"formatting"});case"BBBB":default:return a.dayPeriod(n,{width:"wide",context:"formatting"})}},h:function(e,t,a){if(t==="ho"){let r=e.getHours()%12;return r===0&&(r=12),a.ordinalNumber(r,{unit:"hour"})}return q.h(e,t)},H:function(e,t,a){return t==="Ho"?a.ordinalNumber(e.getHours(),{unit:"hour"}):q.H(e,t)},K:function(e,t,a){const r=e.getHours()%12;return t==="Ko"?a.ordinalNumber(r,{unit:"hour"}):y(r,t.length)},k:function(e,t,a){let r=e.getHours();return r===0&&(r=24),t==="ko"?a.ordinalNumber(r,{unit:"hour"}):y(r,t.length)},m:function(e,t,a){return t==="mo"?a.ordinalNumber(e.getMinutes(),{unit:"minute"}):q.m(e,t)},s:function(e,t,a){return t==="so"?a.ordinalNumber(e.getSeconds(),{unit:"second"}):q.s(e,t)},S:function(e,t){return q.S(e,t)},X:function(e,t,a){const r=e.getTimezoneOffset();if(r===0)return"Z";switch(t){case"X":return Pe(r);case"XXXX":case"XX":return L(r);case"XXXXX":case"XXX":default:return L(r,":")}},x:function(e,t,a){const r=e.getTimezoneOffset();switch(t){case"x":return Pe(r);case"xxxx":case"xx":return L(r);case"xxxxx":case"xxx":default:return L(r,":")}},O:function(e,t,a){const r=e.getTimezoneOffset();switch(t){case"O":case"OO":case"OOO":return"GMT"+$e(r,":");case"OOOO":default:return"GMT"+L(r,":")}},z:function(e,t,a){const r=e.getTimezoneOffset();switch(t){case"z":case"zz":case"zzz":return"GMT"+$e(r,":");case"zzzz":default:return"GMT"+L(r,":")}},t:function(e,t,a){const r=Math.trunc(+e/1e3);return y(r,t.length)},T:function(e,t,a){return y(+e,t.length)}};function $e(e,t=""){const a=e>0?"-":"+",r=Math.abs(e),n=Math.trunc(r/60),o=r%60;return o===0?a+String(n):a+String(n)+t+y(o,2)}function Pe(e,t){return e%60===0?(e>0?"-":"+")+y(Math.abs(e)/60,2):L(e,t)}function L(e,t=""){const a=e>0?"-":"+",r=Math.abs(e),n=y(Math.trunc(r/60),2),o=y(r%60,2);return a+n+t+o}const De=(e,t)=>{switch(e){case"P":return t.date({width:"short"});case"PP":return t.date({width:"medium"});case"PPP":return t.date({width:"long"});case"PPPP":default:return t.date({width:"full"})}},Re=(e,t)=>{switch(e){case"p":return t.time({width:"short"});case"pp":return t.time({width:"medium"});case"ppp":return t.time({width:"long"});case"pppp":default:return t.time({width:"full"})}},ta=(e,t)=>{const a=e.match(/(P+)(p+)?/)||[],r=a[1],n=a[2];if(!n)return De(e,t);let o;switch(r){case"P":o=t.dateTime({width:"short"});break;case"PP":o=t.dateTime({width:"medium"});break;case"PPP":o=t.dateTime({width:"long"});break;case"PPPP":default:o=t.dateTime({width:"full"});break}return o.replace("{{date}}",De(r,t)).replace("{{time}}",Re(n,t))},aa={p:Re,P:ta},ra=/^D+$/,na=/^Y+$/,sa=["D","DD","YY","YYYY"];function ia(e){return ra.test(e)}function oa(e){return na.test(e)}function da(e,t,a){const r=la(e,t,a);if(console.warn(r),sa.includes(e))throw new RangeError(r)}function la(e,t,a){const r=e[0]==="Y"?"years":"days of the month";return`Use \`${e.toLowerCase()}\` instead of \`${e}\` (in \`${t}\`) for formatting ${r} to the input \`${a}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`}const ca=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,ua=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,ma=/^'([^]*?)'?$/,ha=/''/g,fa=/[a-zA-Z]/;function P(e,t,a){var m,g,p,x,M,C,v,R;const r=U(),n=(a==null?void 0:a.locale)??r.locale??Ut,o=(a==null?void 0:a.firstWeekContainsDate)??((g=(m=a==null?void 0:a.locale)==null?void 0:m.options)==null?void 0:g.firstWeekContainsDate)??r.firstWeekContainsDate??((x=(p=r.locale)==null?void 0:p.options)==null?void 0:x.firstWeekContainsDate)??1,c=(a==null?void 0:a.weekStartsOn)??((C=(M=a==null?void 0:a.locale)==null?void 0:M.options)==null?void 0:C.weekStartsOn)??r.weekStartsOn??((R=(v=r.locale)==null?void 0:v.options)==null?void 0:R.weekStartsOn)??0,h=T(e,a==null?void 0:a.in);if(!bt(h))throw new RangeError("Invalid time value");let f=t.match(ua).map(k=>{const N=k[0];if(N==="p"||N==="P"){const O=aa[N];return O(k,n.formatLong)}return k}).join("").match(ca).map(k=>{if(k==="''")return{isToken:!1,value:"'"};const N=k[0];if(N==="'")return{isToken:!1,value:ga(k)};if(Se[N])return{isToken:!0,value:k};if(N.match(fa))throw new RangeError("Format string contains an unescaped latin alphabet character `"+N+"`");return{isToken:!1,value:k}});n.localize.preprocessor&&(f=n.localize.preprocessor(h,f));const u={firstWeekContainsDate:o,weekStartsOn:c,locale:n};return f.map(k=>{if(!k.isToken)return k.value;const N=k.value;(!(a!=null&&a.useAdditionalWeekYearTokens)&&oa(N)||!(a!=null&&a.useAdditionalDayOfYearTokens)&&ia(N))&&da(N,t,String(e));const O=Se[N[0]];return O(h,N,n.localize,u)}).join("")}function ga(e){const t=e.match(ma);return t?t[1].replace(ha,"'"):e}function pe(e,t,a){const[r,n]=de(a==null?void 0:a.in,e,t);return r.getFullYear()===n.getFullYear()&&r.getMonth()===n.getMonth()}function ba(e,t,a){return Ee(e,-1,a)}const pa={lessThanXSeconds:{one:"menos de un segundo",other:"menos de {{count}} segundos"},xSeconds:{one:"1 segundo",other:"{{count}} segundos"},halfAMinute:"medio minuto",lessThanXMinutes:{one:"menos de un minuto",other:"menos de {{count}} minutos"},xMinutes:{one:"1 minuto",other:"{{count}} minutos"},aboutXHours:{one:"alrededor de 1 hora",other:"alrededor de {{count}} horas"},xHours:{one:"1 hora",other:"{{count}} horas"},xDays:{one:"1 día",other:"{{count}} días"},aboutXWeeks:{one:"alrededor de 1 semana",other:"alrededor de {{count}} semanas"},xWeeks:{one:"1 semana",other:"{{count}} semanas"},aboutXMonths:{one:"alrededor de 1 mes",other:"alrededor de {{count}} meses"},xMonths:{one:"1 mes",other:"{{count}} meses"},aboutXYears:{one:"alrededor de 1 año",other:"alrededor de {{count}} años"},xYears:{one:"1 año",other:"{{count}} años"},overXYears:{one:"más de 1 año",other:"más de {{count}} años"},almostXYears:{one:"casi 1 año",other:"casi {{count}} años"}},xa=(e,t,a)=>{let r;const n=pa[e];return typeof n=="string"?r=n:t===1?r=n.one:r=n.other.replace("{{count}}",t.toString()),a!=null&&a.addSuffix?a.comparison&&a.comparison>0?"en "+r:"hace "+r:r},ya={full:"EEEE, d 'de' MMMM 'de' y",long:"d 'de' MMMM 'de' y",medium:"d MMM y",short:"dd/MM/y"},wa={full:"HH:mm:ss zzzz",long:"HH:mm:ss z",medium:"HH:mm:ss",short:"HH:mm"},va={full:"{{date}} 'a las' {{time}}",long:"{{date}} 'a las' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},ka={date:X({formats:ya,defaultWidth:"full"}),time:X({formats:wa,defaultWidth:"full"}),dateTime:X({formats:va,defaultWidth:"full"})},Na={lastWeek:"'el' eeee 'pasado a la' p",yesterday:"'ayer a la' p",today:"'hoy a la' p",tomorrow:"'mañana a la' p",nextWeek:"eeee 'a la' p",other:"P"},ja={lastWeek:"'el' eeee 'pasado a las' p",yesterday:"'ayer a las' p",today:"'hoy a las' p",tomorrow:"'mañana a las' p",nextWeek:"eeee 'a las' p",other:"P"},Ma=(e,t,a,r)=>t.getHours()!==1?ja[e]:Na[e],Sa={narrow:["AC","DC"],abbreviated:["AC","DC"],wide:["antes de cristo","después de cristo"]},$a={narrow:["1","2","3","4"],abbreviated:["T1","T2","T3","T4"],wide:["1º trimestre","2º trimestre","3º trimestre","4º trimestre"]},Pa={narrow:["e","f","m","a","m","j","j","a","s","o","n","d"],abbreviated:["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"],wide:["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"]},Da={narrow:["d","l","m","m","j","v","s"],short:["do","lu","ma","mi","ju","vi","sá"],abbreviated:["dom","lun","mar","mié","jue","vie","sáb"],wide:["domingo","lunes","martes","miércoles","jueves","viernes","sábado"]},Ta={narrow:{am:"a",pm:"p",midnight:"mn",noon:"md",morning:"mañana",afternoon:"tarde",evening:"tarde",night:"noche"},abbreviated:{am:"AM",pm:"PM",midnight:"medianoche",noon:"mediodia",morning:"mañana",afternoon:"tarde",evening:"tarde",night:"noche"},wide:{am:"a.m.",pm:"p.m.",midnight:"medianoche",noon:"mediodia",morning:"mañana",afternoon:"tarde",evening:"tarde",night:"noche"}},Oa={narrow:{am:"a",pm:"p",midnight:"mn",noon:"md",morning:"de la mañana",afternoon:"de la tarde",evening:"de la tarde",night:"de la noche"},abbreviated:{am:"AM",pm:"PM",midnight:"medianoche",noon:"mediodia",morning:"de la mañana",afternoon:"de la tarde",evening:"de la tarde",night:"de la noche"},wide:{am:"a.m.",pm:"p.m.",midnight:"medianoche",noon:"mediodia",morning:"de la mañana",afternoon:"de la tarde",evening:"de la tarde",night:"de la noche"}},Wa=(e,t)=>Number(e)+"º",Ca={ordinalNumber:Wa,era:E({values:Sa,defaultWidth:"wide"}),quarter:E({values:$a,defaultWidth:"wide",argumentCallback:e=>Number(e)-1}),month:E({values:Pa,defaultWidth:"wide"}),day:E({values:Da,defaultWidth:"wide"}),dayPeriod:E({values:Ta,defaultWidth:"wide",formattingValues:Oa,defaultFormattingWidth:"wide"})},Ea=/^(\d+)(º)?/i,Ia=/\d+/i,Ya={narrow:/^(ac|dc|a|d)/i,abbreviated:/^(a\.?\s?c\.?|a\.?\s?e\.?\s?c\.?|d\.?\s?c\.?|e\.?\s?c\.?)/i,wide:/^(antes de cristo|antes de la era com[uú]n|despu[eé]s de cristo|era com[uú]n)/i},Fa={any:[/^ac/i,/^dc/i],wide:[/^(antes de cristo|antes de la era com[uú]n)/i,/^(despu[eé]s de cristo|era com[uú]n)/i]},Aa={narrow:/^[1234]/i,abbreviated:/^T[1234]/i,wide:/^[1234](º)? trimestre/i},Ha={any:[/1/i,/2/i,/3/i,/4/i]},Ra={narrow:/^[efmajsond]/i,abbreviated:/^(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i,wide:/^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i},qa={narrow:[/^e/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^en/i,/^feb/i,/^mar/i,/^abr/i,/^may/i,/^jun/i,/^jul/i,/^ago/i,/^sep/i,/^oct/i,/^nov/i,/^dic/i]},za={narrow:/^[dlmjvs]/i,short:/^(do|lu|ma|mi|ju|vi|s[áa])/i,abbreviated:/^(dom|lun|mar|mi[ée]|jue|vie|s[áa]b)/i,wide:/^(domingo|lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado)/i},_a={narrow:[/^d/i,/^l/i,/^m/i,/^m/i,/^j/i,/^v/i,/^s/i],any:[/^do/i,/^lu/i,/^ma/i,/^mi/i,/^ju/i,/^vi/i,/^sa/i]},La={narrow:/^(a|p|mn|md|(de la|a las) (mañana|tarde|noche))/i,any:/^([ap]\.?\s?m\.?|medianoche|mediodia|(de la|a las) (mañana|tarde|noche))/i},Ba={any:{am:/^a/i,pm:/^p/i,midnight:/^mn/i,noon:/^md/i,morning:/mañana/i,afternoon:/tarde/i,evening:/tarde/i,night:/noche/i}},Va={ordinalNumber:Ae({matchPattern:Ea,parsePattern:Ia,valueCallback:function(e){return parseInt(e,10)}}),era:I({matchPatterns:Ya,defaultMatchWidth:"wide",parsePatterns:Fa,defaultParseWidth:"any"}),quarter:I({matchPatterns:Aa,defaultMatchWidth:"wide",parsePatterns:Ha,defaultParseWidth:"any",valueCallback:e=>e+1}),month:I({matchPatterns:Ra,defaultMatchWidth:"wide",parsePatterns:qa,defaultParseWidth:"any"}),day:I({matchPatterns:za,defaultMatchWidth:"wide",parsePatterns:_a,defaultParseWidth:"any"}),dayPeriod:I({matchPatterns:La,defaultMatchWidth:"any",parsePatterns:Ba,defaultParseWidth:"any"})},Y={code:"es",formatDistance:xa,formatLong:ka,formatRelative:Ma,localize:Ca,match:Va,options:{weekStartsOn:1,firstWeekContainsDate:1}},Q=e=>{if(!e)return null;if(e instanceof Date)return Number.isNaN(e.getTime())?null:e;const t=String(e).trim();if(!t)return null;if(/^\d{4}-\d{2}-\d{2}$/.test(t)){const r=new Date(`${t}T00:00:00`);return Number.isNaN(r.getTime())?null:r}if(/^\d{2}\/\d{2}\/\d{4}$/.test(t)){const[r,n,o]=t.split("/").map(Number),c=new Date(o,n-1,r);return Number.isNaN(c.getTime())?null:c}const a=new Date(t);return Number.isNaN(a.getTime())?null:a},w=e=>e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"),ie=e=>{if(!e)return"--:--";const t=String(e).match(/(\d{1,2}):(\d{2})/);if(t){const a=Number(t[1]),r=Number(t[2]);if(!Number.isNaN(a)&&!Number.isNaN(r))return`${a.toString().padStart(2,"0")}:${r.toString().padStart(2,"0")}`}return String(e).slice(0,5)},qe=e=>{var a,r;const t=((a=e.patient)==null?void 0:a.trim())||((r=e.title)==null?void 0:r.trim())||"";return!t||t==="Nueva Reserva"?"Sin nombre":t},ve=e=>e==="interview"?"Entrevista":e==="block"?"Bloqueo":"Sesion",ze=e=>e.coverageType||"particular",Xa=(e,t)=>{const a=t.find(n=>n.id===e.professionalId||e.proId),r=$.find(n=>n.id===e.roomId);return a&&r?`${a.name} · ${r.name}`:a?a.name:r?r.name:"Sin asignar"},Te=e=>{if(!e)return Number.POSITIVE_INFINITY;const t=String(e).match(/^(\d{1,2}):(\d{2})$/);if(!t)return Number.POSITIVE_INFINITY;const a=Number(t[1]),r=Number(t[2]);return Number.isNaN(a)||Number.isNaN(r)?Number.POSITIVE_INFINITY:a*60+r},oe=e=>[...e].sort((t,a)=>Te(t.start)-Te(a.start)),ke=e=>{const t=e.reduce((r,n)=>{const o=ze(n);return r[o]=(r[o]||0)+1,r},{particular:0,"obra social":0}),a=e.reduce((r,n)=>{const o=ve(n.kind||n.type);return r[o]=(r[o]||0)+1,r},{Sesion:0,Entrevista:0,Bloqueo:0});return{coverage:t,types:a}},Qa=e=>{const t=H(e,{weekStartsOn:1}),a=le(e,{weekStartsOn:1}),r=we({start:t,end:a});return{weekStart:t,weekEnd:a,weekDays:r}},V=e=>P(e,"yyyy-MM-dd"),Ga=(e,t)=>{const{weekStart:a,weekEnd:r,weekDays:n}=Qa(e),o=t.filter(u=>{const m=Q(u.date);return m?m>=a&&m<=r&&u.roomId:!1}),c=o.reduce((u,m)=>{const g=Q(m.date);if(!g)return u;const p=`${m.roomId}:${V(g)}`;return u[p]=u[p]||[],u[p].push(m),u},{}),h=$.map(u=>{const m=n.map(p=>{const x=`${u.id}:${V(p)}`,M=oe(c[x]||[]);return{day:p,appointments:M,free:M.length===0}}),g=m.filter(p=>p.free).length;return{room:u,dayCells:m,totalAppointments:m.reduce((p,x)=>p+x.appointments.length,0),freeDays:g}}),f=n.map(u=>{const m=V(u),g=o.filter(M=>{const C=Q(M.date);return C?V(C)===m:!1}),p=new Set(g.map(M=>M.roomId).filter(Boolean)),x=$.filter(M=>!p.has(M.id));return{day:u,appointments:oe(g),freeRooms:x,occupiedRooms:$.length-x.length}});return{weekDays:n,weekAppointments:o,rooms:h,daySummary:f}},Ne=(e,t,a,r=!1)=>`<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${w(e)}</title>
    <style>
      @page {
        size: ${r?"A4 landscape":"A4 portrait"};
        margin: 14mm;
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: #f8fafc; color: #0f172a; font-family: Inter, Arial, sans-serif; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .sheet { max-width: 1120px; margin: 0 auto; padding: 80px 0 0; }
      .preview-bar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 20;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 14px 20px;
        background: rgba(248, 250, 252, 0.95);
        border-bottom: 1px solid #e2e8f0;
        backdrop-filter: blur(10px);
      }
      .preview-bar .title { font-size: 14px; font-weight: 900; color: #0f172a; }
      .preview-bar .actions { display: flex; gap: 8px; }
      .preview-btn {
        appearance: none;
        border: 0;
        border-radius: 999px;
        padding: 10px 14px;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
      }
      .preview-btn.primary { background: #67b7c9; color: white; }
      .preview-btn.secondary { background: white; color: #334155; border: 1px solid #dbe4ee; }
      .hero {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
        padding: 18px 20px;
        border-radius: 24px;
        background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%);
        color: white;
        margin-bottom: 16px;
      }
      .hero h1 { margin: 0; font-size: 28px; line-height: 1.05; }
      .hero p { margin: 6px 0 0; color: rgba(255,255,255,.8); font-size: 12px; }
      .meta { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(255,255,255,.14);
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
      }
      .summary {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 16px;
      }
      .card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        padding: 14px;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
      }
      .card .label { font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: #64748b; font-weight: 800; }
      .card .value { margin-top: 8px; font-size: 24px; font-weight: 900; color: #0f172a; }
      .grid { display: grid; gap: 12px; }
      .section {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 20px;
        padding: 16px;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .section-header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        margin-bottom: 12px;
      }
      .section-header h2 { margin: 0; font-size: 18px; }
      .section-header span { font-size: 12px; color: #64748b; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; }
      th, td {
        text-align: left;
        padding: 10px 8px;
        border-bottom: 1px solid #e2e8f0;
        font-size: 12px;
        vertical-align: top;
      }
      th {
        text-transform: uppercase;
        letter-spacing: .08em;
        font-size: 10px;
        color: #64748b;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: .06em;
      }
      .badge.session { background: #dbeafe; color: #1d4ed8; }
      .badge.interview { background: #fef3c7; color: #92400e; }
      .badge.block { background: #0f172a; color: white; }
      .badge.coverage { background: #eef2ff; color: #4338ca; }
      .day-card {
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        padding: 14px;
        margin-bottom: 12px;
        background: #fff;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .day-top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: baseline;
        margin-bottom: 10px;
      }
      .day-top h3 { margin: 0; font-size: 16px; }
      .day-top p { margin: 0; font-size: 12px; color: #64748b; font-weight: 700; }
      .appointment-list { display: grid; gap: 8px; }
      .appointment-item {
        display: grid;
        grid-template-columns: 88px 1fr;
        gap: 12px;
        padding: 10px 12px;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
      }
      .time { font-weight: 900; color: #0f172a; }
      .subtle { color: #64748b; font-size: 11px; font-weight: 700; margin-top: 4px; }
      .empty {
        padding: 22px;
        border: 1px dashed #cbd5e1;
        border-radius: 18px;
        text-align: center;
        color: #64748b;
        background: #f8fafc;
        font-weight: 700;
      }
      .footer {
        margin-top: 14px;
        color: #94a3b8;
        font-size: 11px;
        text-align: right;
      }
      .month-calendar {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: 10px;
      }
      .month-head {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: .12em;
        color: #64748b;
        font-weight: 800;
      }
      .month-cell {
        min-height: 128px;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        break-inside: avoid;
      }
      .month-cell.outside { opacity: .38; }
      .month-day {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
      }
      .month-day .number {
        width: 26px;
        height: 26px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 900;
        color: #0f172a;
        background: #eff6ff;
      }
      .month-day .count {
        font-size: 10px;
        font-weight: 800;
        color: #64748b;
      }
      .month-badges {
        display: grid;
        gap: 6px;
      }
      .month-badge {
        border-radius: 999px;
        padding: 6px 8px;
        font-size: 10px;
        font-weight: 800;
        display: flex;
        justify-content: space-between;
        gap: 8px;
        align-items: center;
        border: 1px solid transparent;
      }
      .month-badge.session { background: #dbeafe; color: #1d4ed8; border-color: #bfdbfe; }
      .month-badge.interview { background: #fef3c7; color: #92400e; border-color: #fde68a; }
      .month-badge.block { background: #f3e8ff; color: #6b21a8; border-color: #e9d5ff; }
      .month-badge .time { font-size: 9px; }
      .week-summary {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 16px;
      }
      .week-grid {
        display: grid;
        grid-template-columns: 128px repeat(7, minmax(0, 1fr));
        gap: 8px;
        align-items: stretch;
      }
      .week-head {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: .12em;
        color: #64748b;
        font-weight: 800;
        padding: 6px 8px;
      }
      .week-room {
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        padding: 10px;
        min-height: 92px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .week-room .room-name {
        font-size: 12px;
        font-weight: 900;
        color: #0f172a;
        margin: 0;
      }
      .week-room .room-meta {
        font-size: 10px;
        color: #64748b;
        font-weight: 700;
        margin-top: 4px;
      }
      .week-cell {
        min-height: 92px;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        break-inside: avoid;
      }
      .week-cell.free {
        background: linear-gradient(180deg, #f0fdf4 0%, #f8fafc 100%);
        border-color: #bbf7d0;
      }
      .week-cell.busy {
        border-color: #bfdbfe;
      }
      .week-cell .count {
        font-size: 10px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: .08em;
        color: #64748b;
      }
      .week-cell .free-label {
        font-size: 12px;
        font-weight: 900;
        color: #15803d;
      }
      .week-cell .mini-list {
        display: grid;
        gap: 4px;
      }
      .week-pill {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        align-items: center;
        padding: 5px 7px;
        border-radius: 999px;
        font-size: 9px;
        font-weight: 800;
        background: #eff6ff;
        color: #1d4ed8;
        border: 1px solid #bfdbfe;
      }
      .week-pill.interview { background: #fef3c7; color: #92400e; border-color: #fde68a; }
      .week-pill.block { background: #f3e8ff; color: #6b21a8; border-color: #e9d5ff; }
      .week-pill .time { font-size: 8px; opacity: .8; }
      .day-free-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .day-free-list .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: 999px;
        padding: 6px 10px;
        background: #ecfeff;
        color: #155e75;
        border: 1px solid #a5f3fc;
        font-size: 10px;
        font-weight: 800;
      }
      @media print {
        body { background: white; }
        .sheet { max-width: none; }
        .hero, .card, .section, .day-card { box-shadow: none; }
        .preview-bar { display: none; }
      }
    </style>
  </head>
  <body>
    <div class="preview-bar">
      <div class="title">${w(e)} - Vista previa</div>
      <div class="actions">
        <button class="preview-btn secondary" onclick="window.close()">Cerrar</button>
        <button class="preview-btn primary" onclick="window.print()">Imprimir</button>
      </div>
    </div>
    <div class="sheet">
      ${a}
    </div>
  </body>
</html>`,Ua=(e,t)=>{if(typeof window>"u")return;const a=window.open("","_blank","width=1280,height=900");a&&(a.document.open(),a.document.write(t),a.document.close(),a.document.title=e,a.focus())},Ja=(e,t)=>{const a=ye(),r=P(e,"EEEE, d MMMM yyyy",{locale:Y}),n=oe(t.filter(u=>{const m=Q(u.date);return m?re(m,e):!1})),{coverage:o,types:c}=ke(n),h=P(new Date,"dd/MM/yyyy HH:mm",{locale:Y}),f=n.length?n.map(u=>`
      <tr>
        <td><strong>${w(ie(u.start))}</strong><div class="subtle">${w(ie(u.end))}</div></td>
        <td><strong>${w(qe(u))}</strong><div class="subtle">${w(Xa(u,a))}</div></td>
        <td><span class="badge ${u.kind||u.type}">${w(ve(u.kind||u.type))}</span></td>
        <td><span class="badge coverage">${w(ze(u))}</span></td>
        <td>${w(u.notes||"-")}</td>
      </tr>
    `).join(""):'<tr><td colspan="5"><div class="empty">No hay turnos para este dia.</div></td></tr>';return Ne(`Agenda diaria - ${r}`,"Resumen listo para compartir con el equipo.",`
      <div class="hero">
        <div>
          <h1>Agenda diaria</h1>
          <p>${w(r)}</p>
        </div>
        <div class="meta">
          <span class="pill">Generado: ${w(h)}</span>
          <span class="pill">Turnos: ${n.length}</span>
        </div>
      </div>
      <div class="summary">
        <div class="card"><div class="label">Total</div><div class="value">${n.length}</div></div>
        <div class="card"><div class="label">Particular</div><div class="value">${o.particular||0}</div></div>
        <div class="card"><div class="label">Obra social</div><div class="value">${o["obra social"]||0}</div></div>
        <div class="card"><div class="label">Tipos</div><div class="value">${c.Sesion||0}/${c.Entrevista||0}/${c.Bloqueo||0}</div></div>
      </div>
      <div class="section">
        <div class="section-header">
          <h2>Detalle del día</h2>
          <span>${w(r)}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Horario</th>
              <th>Paciente / destino</th>
              <th>Tipo</th>
              <th>Cobertura</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody>${f}</tbody>
        </table>
      </div>
      <div class="footer">Reporte diario listo para imprimir o guardar como PDF.</div>
    `,!1)},Ka=(e,t)=>{ye();const a=P(e,"MMMM yyyy",{locale:Y}),r=t.filter(m=>{const g=Q(m.date);return g?g.getMonth()===e.getMonth()&&g.getFullYear()===e.getFullYear():!1}),{coverage:n,types:o}=ke(r),c=P(new Date,"dd/MM/yyyy HH:mm",{locale:Y}),h=r.reduce((m,g)=>{const p=Q(g.date);if(!p)return m;const x=P(p,"yyyy-MM-dd");return m[x]=m[x]||[],m[x].push(g),m},{}),f=we({start:H(Fe(e),{weekStartsOn:1}),end:le(Ye(e),{weekStartsOn:1})}),u=f.length?`
      <div class="section">
        <div class="section-header">
          <h2>Calendario mensual</h2>
          <span>${w(a)}</span>
        </div>
        <div class="month-calendar">
          ${["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(m=>`<div class="month-head">${m}</div>`).join("")}
          ${f.map(m=>{const g=oe(h[P(m,"yyyy-MM-dd")]||[]);return`
              <div class="month-cell ${pe(m,e)?"":"outside"}">
                <div class="month-day">
                  <span class="number">${P(m,"d")}</span>
                  <span class="count">${g.length} turno${g.length===1?"":"s"}</span>
                </div>
                <div class="month-badges">
                  ${g.slice(0,3).map(p=>`
                    <div class="month-badge ${p.kind||p.type}">
                      <span>${w(qe(p))}</span>
                      <span class="time">${w(ie(p.start))}</span>
                    </div>
                  `).join("")}
                  ${g.length>3?`<div class="subtle">+ ${g.length-3} más</div>`:""}
                </div>
              </div>
            `}).join("")}
        </div>
      </div>
    `:'<div class="section"><div class="empty">No hay turnos para este mes.</div></div>';return Ne(`Agenda mensual - ${a}`,"Vista general para compartir con colaboradores.",`
      <div class="hero">
        <div>
          <h1>Agenda mensual</h1>
          <p>${w(a)}</p>
        </div>
        <div class="meta">
          <span class="pill">Generado: ${w(c)}</span>
          <span class="pill">Turnos: ${r.length}</span>
        </div>
      </div>
      <div class="summary">
        <div class="card"><div class="label">Total</div><div class="value">${r.length}</div></div>
        <div class="card"><div class="label">Particular</div><div class="value">${n.particular||0}</div></div>
        <div class="card"><div class="label">Obra social</div><div class="value">${n["obra social"]||0}</div></div>
        <div class="card"><div class="label">Tipos</div><div class="value">${o.Sesion||0}/${o.Entrevista||0}/${o.Bloqueo||0}</div></div>
      </div>
      <div class="section">
        <div class="section-header">
          <h2>Resumen del mes</h2>
          <span>${w(a)}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Total</th>
              <th>Cobertura particular</th>
              <th>Cobertura obra social</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Sesión</td><td>${o.Sesion||0}</td><td>${n.particular||0}</td><td>${n["obra social"]||0}</td></tr>
            <tr><td>Entrevista</td><td>${o.Entrevista||0}</td><td colspan="2">Ver detalle diario</td></tr>
            <tr><td>Bloqueo</td><td>${o.Bloqueo||0}</td><td colspan="2">Ver detalle diario</td></tr>
          </tbody>
        </table>
      </div>
      ${u}
      <div class="footer">Reporte mensual listo para imprimir o guardar como PDF.</div>
    `,!0)},Za=(e,t)=>{ye();const a=`${P(H(e,{weekStartsOn:1}),"dd/MM/yyyy",{locale:Y})} - ${P(le(e,{weekStartsOn:1}),"dd/MM/yyyy",{locale:Y})}`,{weekDays:r,weekAppointments:n,rooms:o,daySummary:c}=Ga(e,t),h=P(new Date,"dd/MM/yyyy HH:mm",{locale:Y}),{types:f}=ke(n),u=o.reduce((v,R)=>v+R.freeDays,0),m=c.filter(v=>v.freeRooms.length===$.length).length,g=V(e),p=c.find(v=>V(v.day)===g),x=(p==null?void 0:p.freeRooms.length)||0,M=`
    <div class="section">
      <div class="section-header">
        <h2>Disponibilidad por consultorio</h2>
        <span>${w(a)}</span>
      </div>
      <div class="week-grid">
        <div></div>
        ${r.map(v=>`<div class="week-head">${w(P(v,"EEE dd",{locale:Y}))}</div>`).join("")}
        ${o.map(({room:v,dayCells:R,totalAppointments:k,freeDays:N})=>`
          <div class="week-room">
            <div>
              <p class="room-name">${w(v.name)}</p>
              <div class="room-meta">${k} turnos · ${N} libres</div>
            </div>
            <div class="room-meta">Consultorio fijo</div>
          </div>
          ${R.map(O=>`
            <div class="week-cell ${O.free?"free":"busy"}">
              <div class="count">${O.appointments.length} turno${O.appointments.length===1?"":"s"}</div>
              ${O.free?'<div class="free-label">Libre</div>':`
                <div class="mini-list">
                  ${O.appointments.slice(0,2).map(_=>`
                    <div class="week-pill ${_.kind||_.type}">
                      <span>${w(ve(_.kind||_.type))}</span>
                      <span class="time">${w(ie(_.start))}</span>
                    </div>
                  `).join("")}
                  ${O.appointments.length>2?`<div class="subtle">+ ${O.appointments.length-2} más</div>`:""}
                </div>
              `}
            </div>
          `).join("")}
        `).join("")}
      </div>
    </div>
  `,C=c.filter(v=>v.freeRooms.length>0).map(v=>`
      <span class="chip">
        ${w(P(v.day,"EEE dd",{locale:Y}))} · ${v.freeRooms.length} libres
      </span>
    `).join("");return Ne(`Disponibilidad semanal - ${a}`,"Resumen semanal de consultorios para compartir con colaboradores.",`
      <div class="hero">
        <div>
          <h1>Disponibilidad semanal</h1>
          <p>${w(a)}</p>
        </div>
        <div class="meta">
          <span class="pill">Generado: ${w(h)}</span>
          <span class="pill">Consultorios: ${$.length}</span>
        </div>
      </div>
      <div class="summary">
        <div class="card"><div class="label">Turnos semana</div><div class="value">${n.length}</div></div>
        <div class="card"><div class="label">Consultorios libres hoy</div><div class="value">${x}/${$.length}</div></div>
        <div class="card"><div class="label">Días totalmente libres</div><div class="value">${m}</div></div>
        <div class="card"><div class="label">Bloques libres</div><div class="value">${u}</div></div>
      </div>
      <div class="section">
        <div class="section-header">
          <h2>Resumen rápido</h2>
          <span>${w(a)}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Indicador</th>
              <th>Total</th>
              <th>Sesiones</th>
              <th>Entrevistas</th>
              <th>Bloqueos</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Semana actual</td>
              <td>${n.length}</td>
              <td>${f.Sesion||0}</td>
              <td>${f.Entrevista||0}</td>
              <td>${f.Bloqueo||0}</td>
            </tr>
            <tr>
              <td>Consultorios</td>
              <td colspan="4">${$.map(v=>w(v.name)).join(" · ")}</td>
            </tr>
          </tbody>
        </table>
      </div>
      ${M}
      <div class="section">
        <div class="section-header">
          <h2>Días con espacio libre</h2>
          <span>${w(a)}</span>
        </div>
        <div class="day-free-list">
          ${C||'<div class="empty">No hay días libres en esta semana.</div>'}
        </div>
      </div>
      <div class="footer">Reporte semanal de disponibilidad listo para imprimir o guardar como PDF.</div>
    `,!0)},me=(e,t)=>{Ua(e,t)},Oe=Array.from({length:14},(e,t)=>8+t),We=88,er=45,tr={id:"unassigned",name:"Sin asignar",color:"bg-slate-400"},G=e=>{if(!e)return null;if(e instanceof Date)return Number.isNaN(e.getTime())?null:e;const t=String(e).trim();if(!t)return null;if(/^\d{4}-\d{2}-\d{2}$/.test(t)){const r=new Date(`${t}T00:00:00`);return Number.isNaN(r.getTime())?null:r}if(/^\d{2}\/\d{2}\/\d{4}$/.test(t)){const[r,n,o]=t.split("/").map(Number),c=new Date(o,n-1,r);return Number.isNaN(c.getTime())?null:c}const a=new Date(t);return Number.isNaN(a.getTime())?null:a},K=e=>{var a,r;const t=((a=e.patient)==null?void 0:a.trim())||((r=e.title)==null?void 0:r.trim())||"";return!t||t==="Nueva Reserva"?"Sin nombre":t},ar=e=>e.kind||e.type||"session",Z=e=>e==="interview"?"Entrevista":e==="block"?"Bloqueo":"Sesión",ee=e=>e==="interview"?"bg-amber-100 text-amber-950 border-amber-200":e==="block"?"bg-violet-100 text-violet-950 border-violet-200":"bg-sky-100 text-sky-950 border-sky-200",he=e=>e==="interview"?"bg-amber-50 text-amber-800 border-amber-200":e==="block"?"bg-violet-50 text-violet-800 border-violet-200":"bg-sky-50 text-sky-800 border-sky-200",z=e=>{if(!e)return Number.POSITIVE_INFINITY;const t=String(e).match(/^(\d{1,2}):(\d{2})$/);if(!t)return Number.POSITIVE_INFINITY;const a=Number(t[1]),r=Number(t[2]);return Number.isNaN(a)||Number.isNaN(r)?Number.POSITIVE_INFINITY:a*60+r},fe=e=>{const t=Math.max(e,0),a=Math.floor(t/60),r=t%60;return`${a.toString().padStart(2,"0")}:${r.toString().padStart(2,"0")}`},te=e=>[...e].sort((t,a)=>z(t.start)-z(a.start)),ge=e=>{if(!e)return"--:--";const t=String(e).match(/(\d{1,2}):(\d{2})/);if(t){const a=Number(t[1]),r=Number(t[2]);if(!Number.isNaN(a)&&!Number.isNaN(r))return`${a.toString().padStart(2,"0")}:${r.toString().padStart(2,"0")}`}return String(e).slice(0,5)},be=e=>e.coverageType||"particular",rr=e=>!!(e.professionalId||e.proId||e.roomId),ae=(e,t)=>P(e,t,{locale:Y}),nr=e=>e.charAt(0).toUpperCase()+e.slice(1),dr=({onOpenModal:e,appointments:t,focusDate:a})=>{const[r,n]=W.useState(new Date),[o,c]=W.useState("professionals"),[h,f]=W.useState("daily"),u=W.useRef(!1),m=W.useRef(null),[g]=Je(),p=i=>{const l=g.find(b=>b.id===i.professionalId||i.proId),d=$.find(b=>b.id===i.roomId);return l&&d?`${l.name} · ${d.name}`:l?l.name:d?d.name:"Sin asignar"};W.useEffect(()=>{if(!a)return;const i=G(a);i&&(n(i),f("daily"),u.current=!0)},[a]),W.useEffect(()=>{if(u.current)return;const i=[...t].map(l=>({appointment:l,date:G(l.date)})).filter(l=>!!l.date).sort((l,d)=>l.date.getTime()-d.date.getTime())[0];i&&(n(i.date),f("daily"),u.current=!0)},[t]);const x=W.useMemo(()=>te(t.filter(i=>{const l=G(i.date);return l?re(l,r):!1})),[t,r]),M=W.useMemo(()=>x.reduce((l,d)=>{const b=ar(d);return l.total+=1,b==="interview"?l.interview+=1:b==="block"?l.block+=1:l.session+=1,l},{total:0,session:0,interview:0,block:0}),[x]),C=W.useMemo(()=>{if(o==="professionals"){const l=new Set(x.filter(d=>d.professionalId||d.proId).map(d=>d.professionalId||d.proId));return{label:"Profesionales libres",total:g.length,busy:l.size,free:Math.max(g.length-l.size,0)}}const i=new Set(x.filter(l=>l.roomId).map(l=>l.roomId));return{label:"Consultorios libres",total:$.length,busy:i.size,free:Math.max($.length-i.size,0)}},[g.length,x,o]);W.useMemo(()=>t.filter(i=>{const l=G(i.date);return l?pe(l,r):!1}),[t,r]);const v=W.useMemo(()=>{const i=o==="professionals"?g.map(d=>({id:d.id,name:d.name,color:d.color})):$.map(d=>({id:d.id,name:d.name}));return x.some(d=>!rr(d))?[...i,tr]:i},[x,o]),R=W.useMemo(()=>{const i=["bg-cyan-500","bg-emerald-500","bg-amber-500","bg-violet-500","bg-rose-500","bg-sky-500"];return $.map((d,b)=>({...d,colorClass:i[b%i.length],...(()=>{const j=te(x.filter(D=>D.roomId===d.id));return{totalAppointments:j.length,appointments:j.slice(0,2),overflowCount:Math.max(j.length-2,0)}})()}))},[x]),k=te(x),N=i=>k.filter(l=>Le(l,i)),O=i=>(z(i)-480)/60*We,_=(i,l)=>{const d=z(l)-z(i);return Math.max(d/60*We,68)},_e=i=>!i.professionalId&&!i.proId&&!i.roomId,Le=(i,l)=>l==="unassigned"?_e(i):o==="professionals"?(i.professionalId||i.proId)===l:i.roomId===l,Be=()=>{const i=Ja(r,t);me(`Agenda diaria - ${ae(r,"dd-MM-yyyy")}`,i)},Ve=()=>{const i=Ka(r,t);me(`Agenda mensual - ${ae(r,"MMMM yyyy")}`,i)},Xe=()=>{const i=Za(r,t);me(`Disponibilidad semanal - ${ae(r,"dd-MM-yyyy")}`,i)},Qe=(i,l)=>{let b=Math.max(l,480),j=0;for(;j<24;){j+=1;const D=b+er,J=i.filter(A=>overlaps(fe(b),fe(D),A.start,A.end)).sort((A,Ue)=>z(A.start)-z(Ue.start));if(J.length===0)return b;const ce=Math.max(...J.map(A=>z(A.end||A.start)));b=Math.max(ce,b+1)}return b},Ge=(i,l,d)=>{const b=i.currentTarget.getBoundingClientRect(),j=i.clientY-b.top,D=l*60+(j>=b.height/2?30:0),J=N(d.id),ce=Qe(J,D),A=P(r,"yyyy-MM-dd");e(o==="rooms"?d.id==="unassigned"?void 0:d.name:void 0,o==="professionals"?d.id==="unassigned"?void 0:d.name:void 0,void 0,{date:A,startTime:fe(ce)})};return W.useEffect(()=>{if(h!=="daily")return;const i=m.current;if(!i)return;const l=x[0],d=l?Math.max(O(l.start)-120,0):0,b=window.requestAnimationFrame(()=>{i.scrollTop=d});return()=>window.cancelAnimationFrame(b)},[x,h]),s.jsxs("div",{className:"h-full flex flex-col gap-1.5 md:gap-2 min-h-0",children:[s.jsxs("div",{className:"flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between",children:[s.jsx("div",{className:"hidden md:block space-y-1 max-w-2xl min-w-0",children:s.jsxs("div",{className:"flex items-start gap-2 md:gap-2.5",children:[s.jsx("div",{className:"p-1.5 rounded-2xl bg-gradient-to-br from-cyan-100 via-blue-50 to-lavender-100 text-blue-600 border border-blue-100 shrink-0 shadow-sm",children:s.jsx(Ke,{className:"w-4 h-4"})}),s.jsx("div",{className:"min-w-0",children:s.jsxs("h1",{className:"text-[1.05rem] md:text-[1.45rem] lg:text-[1.55rem] font-black text-slate-900 tracking-tight leading-tight",children:[s.jsx("span",{className:"md:hidden",children:"Agenda"}),s.jsx("span",{className:"hidden md:inline",children:"Agenda Operativa"})]})})]})}),s.jsxs("div",{className:"flex w-full flex-col gap-1.5 lg:w-auto lg:items-end",children:[s.jsxs("div",{className:"flex flex-wrap items-center justify-end gap-1.5 w-full",children:[s.jsxs("div",{className:"flex bg-slate-100/80 p-0.5 rounded-xl gap-1 w-full sm:w-auto border border-slate-200/70 shrink-0 min-w-0",children:[s.jsx("button",{onClick:()=>f("daily"),className:S("flex-1 md:flex-none px-2 md:px-2.5 py-1 md:py-1.25 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-[0.22em] transition-all",h==="daily"?"bg-white text-blue-600 shadow-sm":"text-slate-500"),children:"Día"}),s.jsx("button",{onClick:()=>f("monthly"),className:S("flex-1 md:flex-none px-2 md:px-2.5 py-1 md:py-1.25 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-[0.22em] transition-all",h==="monthly"?"bg-white text-blue-600 shadow-sm":"text-slate-500"),children:"Mes"})]}),h==="daily"&&s.jsxs("div",{className:"flex bg-white/80 rounded-xl border border-slate-100 p-1 shadow-sm w-full sm:w-auto backdrop-blur-sm shrink-0 min-w-0",children:[s.jsx("button",{onClick:()=>n(ba(r)),className:"p-1.5 hover:bg-slate-50 rounded-lg transition-colors shrink-0",children:s.jsx(Ze,{className:"w-4 h-4 text-slate-400"})}),s.jsx("div",{className:"px-2 py-1.25 font-bold text-slate-700 text-center flex-1 md:min-w-[150px] text-[10px] md:text-[11px] leading-tight truncate",children:nr(ae(r,"EEEE, d MMMM"))}),s.jsx("button",{onClick:()=>n(Ee(r,1)),className:"p-1.5 hover:bg-slate-50 rounded-lg transition-colors shrink-0",children:s.jsx(et,{className:"w-4 h-4 text-slate-400"})})]}),h==="daily"&&s.jsxs("div",{className:"bg-slate-100/80 p-0.5 rounded-xl flex gap-1 w-full sm:w-auto border border-slate-200/70 shrink-0 min-w-0",children:[s.jsxs("button",{onClick:()=>c("professionals"),className:S("flex-1 md:flex-none px-2 md:px-2.5 py-1 md:py-1.25 rounded-lg text-[9px] md:text-[10px] font-bold transition-all inline-flex items-center justify-center gap-1 whitespace-nowrap",o==="professionals"?"bg-white text-blue-600 shadow-sm":"text-slate-500 hover:text-slate-700"),children:[s.jsx(tt,{className:"w-3 h-3 shrink-0"}),"Profesionales"]}),s.jsxs("button",{onClick:()=>c("rooms"),className:S("flex-1 md:flex-none px-2 md:px-2.5 py-1 md:py-1.25 rounded-lg text-[9px] md:text-[10px] font-bold transition-all inline-flex items-center justify-center gap-1 whitespace-nowrap",o==="rooms"?"bg-white text-blue-600 shadow-sm":"text-slate-500 hover:text-slate-700"),children:[s.jsx(ot,{className:"w-3 h-3 shrink-0"}),"Consultorios"]})]})]}),s.jsxs("div",{className:"flex flex-wrap items-center justify-end gap-1.5 w-full",children:[s.jsxs("button",{onClick:()=>e(),className:"inline-flex items-center justify-center gap-2 px-3 md:px-3.5 py-1.5 md:py-2 bg-gradient-to-r from-cyan-500 via-blue-600 to-lavender-500 text-white rounded-xl font-bold text-[10px] hover:brightness-105 transition-colors shadow-lg shadow-blue-200/40 w-full md:w-auto shrink-0 whitespace-nowrap",children:[s.jsx(st,{className:"w-3.5 h-3.5 shrink-0"}),"Nuevo Bloque"]}),s.jsxs("button",{onClick:Be,className:"hidden sm:inline-flex items-center justify-center gap-2 px-3 md:px-3.5 py-1.5 md:py-2 bg-white/80 text-slate-700 border border-slate-200 rounded-xl font-bold text-[10px] hover:bg-slate-50 transition-colors shadow-sm w-full md:w-auto backdrop-blur-sm shrink-0 whitespace-nowrap",children:[s.jsx(ue,{className:"w-3.5 h-3.5 shrink-0"}),"PDF Día"]}),s.jsxs("button",{onClick:Ve,className:"hidden sm:inline-flex items-center justify-center gap-2 px-3 md:px-3.5 py-1.5 md:py-2 bg-white/80 text-slate-700 border border-slate-200 rounded-xl font-bold text-[10px] hover:bg-slate-50 transition-colors shadow-sm w-full md:w-auto backdrop-blur-sm shrink-0 whitespace-nowrap",children:[s.jsx(ue,{className:"w-3.5 h-3.5 shrink-0"}),"PDF Mes"]}),s.jsxs("button",{onClick:Xe,className:"inline-flex items-center justify-center gap-2 px-3 md:px-3.5 py-1.5 md:py-2 bg-white/80 text-slate-700 border border-slate-200 rounded-xl font-bold text-[10px] hover:bg-slate-50 transition-colors shadow-sm w-full md:w-auto backdrop-blur-sm shrink-0 whitespace-nowrap",children:[s.jsx(ue,{className:"w-3.5 h-3.5 shrink-0"}),"PDF Semana"]}),s.jsxs("button",{onClick:()=>{at().catch(i=>{console.warn("No se pudo refrescar la agenda manualmente.",i)})},className:"inline-flex items-center justify-center gap-2 px-3 md:px-3.5 py-1.5 md:py-2 bg-white/80 text-slate-700 border border-slate-200 rounded-xl font-bold text-[10px] hover:bg-slate-50 transition-colors shadow-sm w-full md:w-auto backdrop-blur-sm shrink-0 whitespace-nowrap",children:[s.jsx(ct,{className:"w-3.5 h-3.5 shrink-0"}),"Refrescar"]})]})]})]}),s.jsxs("div",{className:"hidden md:grid gap-2 md:gap-3 lg:gap-4 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))] items-stretch",children:[s.jsxs("div",{className:"rounded-2xl border border-slate-200 bg-white/85 px-3 py-2 shadow-sm",children:[s.jsx("p",{className:"text-[9px] font-black uppercase tracking-[0.22em] text-slate-400",children:"Turnos del día"}),s.jsx("p",{className:"mt-1 text-lg font-black text-slate-900",children:M.total})]}),s.jsxs("div",{className:S("rounded-2xl border px-3 py-2 shadow-sm",he("session")),children:[s.jsx("p",{className:"text-[9px] font-black uppercase tracking-[0.22em] opacity-80",children:"Sesiones"}),s.jsx("p",{className:"mt-1 text-lg font-black",children:M.session})]}),s.jsxs("div",{className:S("rounded-2xl border px-3 py-2 shadow-sm",he("interview")),children:[s.jsx("p",{className:"text-[9px] font-black uppercase tracking-[0.22em] opacity-80",children:"Entrevistas"}),s.jsx("p",{className:"mt-1 text-lg font-black",children:M.interview})]}),s.jsxs("div",{className:S("rounded-2xl border px-3 py-2 shadow-sm",he("block")),children:[s.jsx("p",{className:"text-[9px] font-black uppercase tracking-[0.22em] opacity-80",children:"Bloqueos"}),s.jsx("p",{className:"mt-1 text-lg font-black",children:M.block})]}),s.jsxs("div",{className:"rounded-2xl border border-slate-200 bg-white/85 px-3 py-2 shadow-sm",children:[s.jsx("p",{className:"text-[9px] font-black uppercase tracking-[0.22em] text-slate-400",children:C.label}),s.jsxs("p",{className:"mt-1 text-lg font-black text-slate-900",children:[C.free,"/",C.total]}),s.jsxs("p",{className:"text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400",children:[C.busy," ocupados"]})]})]}),s.jsx("div",{className:"flex-1 overflow-hidden bg-white/80 rounded-3xl border border-slate-100 shadow-sm flex flex-col min-h-0 backdrop-blur-sm",children:h==="daily"?s.jsxs(s.Fragment,{children:[s.jsx("div",{className:"md:hidden p-2 pb-2 space-y-2 overflow-y-auto custom-scrollbar",children:o==="professionals"?s.jsx(s.Fragment,{children:k.length===0?s.jsxs("div",{className:"p-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center",children:[s.jsx("p",{className:"text-sm font-bold text-slate-700",children:"No hay turnos para este día"}),s.jsx("p",{className:"text-xs text-slate-500 mt-1",children:"Creá un bloque nuevo para empezar."})]}):k.map(i=>{const l=g.find(b=>b.id===i.professionalId||i.proId),d=$.find(b=>b.id===i.roomId);return s.jsx("button",{type:"button",onClick:()=>e(d==null?void 0:d.name,l==null?void 0:l.name,i),className:S("w-full text-left rounded-[1.9rem] p-4.5 md:p-4 border shadow-md backdrop-blur-sm min-h-[118px]",ee(i.kind||i.type)),children:s.jsxs("div",{className:"flex items-start justify-between gap-3.5",children:[s.jsxs("div",{className:"min-w-0 flex-1",children:[s.jsxs("p",{className:"text-[11px] font-black uppercase tracking-[0.18em] mb-1.5",children:[i.start," - ",i.end]}),s.jsx("p",{className:"font-black text-[17px] truncate leading-tight",children:K(i)}),s.jsxs("p",{className:"mt-2 text-[12px] font-semibold uppercase tracking-wide opacity-85 truncate",children:[Z(i.kind||i.type)," · ",p(i)]})]}),s.jsx("span",{className:"text-[10px] font-black uppercase opacity-75 shrink-0",children:be(i)})]})},i.id)})}):s.jsx("div",{className:"grid grid-cols-3 gap-1.5",children:R.map(i=>s.jsxs("div",{className:"rounded-2xl border border-slate-100 bg-white/95 shadow-sm p-1 min-h-[172px] flex flex-col",children:[s.jsxs("div",{className:"flex items-center justify-between gap-1 mb-0.5",children:[s.jsxs("div",{className:"flex items-center gap-1 min-w-0",children:[s.jsx("div",{className:S("w-5 h-5 rounded-lg flex items-center justify-center text-white font-black text-[8px]",i.colorClass),children:i.name[0]}),s.jsx("div",{className:"min-w-0",children:s.jsx("p",{className:"text-[8px] font-black text-slate-900 truncate leading-tight",children:i.name})})]}),s.jsx("span",{className:"text-[7px] font-black uppercase tracking-[0.08em] text-cyan-700 bg-cyan-50 border border-cyan-100 px-1 py-0.5 rounded-full shrink-0",children:i.totalAppointments})]}),s.jsx("div",{className:"flex-1 space-y-[3px]",children:i.appointments.length===0?s.jsx("div",{className:"h-full min-h-[128px] rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-1 py-1 text-center flex items-center justify-center",children:s.jsxs("div",{children:[s.jsx("div",{className:"mx-auto mb-1 h-6 w-6 rounded-full bg-slate-200/80 flex items-center justify-center text-slate-500 text-[10px] font-black",children:"0"}),s.jsx("p",{className:"text-[8px] font-bold text-slate-700",children:"Libre"})]})}):s.jsxs(s.Fragment,{children:[i.appointments.map(l=>{const d=g.find(j=>j.id===l.professionalId||j.id===l.proId),b=l.kind||l.type;return s.jsx("button",{type:"button",onClick:()=>e(i.name,d==null?void 0:d.name,l),className:S("w-full text-left rounded-xl px-1 py-1 border shadow-sm backdrop-blur-sm min-h-[40px] flex items-center",ee(b)),children:s.jsxs("div",{className:"flex items-center gap-1.5 w-full min-w-0",children:[s.jsxs("div",{className:"shrink-0 w-7 text-[8px] font-black leading-none text-center",children:[s.jsx("div",{children:l.start}),s.jsx("div",{className:"text-[7px] opacity-70",children:"-"}),s.jsx("div",{children:l.end})]}),s.jsxs("div",{className:"min-w-0 flex-1",children:[s.jsxs("div",{className:"flex items-center gap-1 min-w-0",children:[s.jsx("span",{className:"h-1.5 w-1.5 rounded-full bg-current/70 shrink-0"}),s.jsx("p",{className:"font-black text-[9px] truncate leading-tight",children:K(l)})]}),s.jsx("p",{className:"mt-0.5 text-[7px] font-semibold uppercase tracking-wide opacity-80 truncate",children:Z(b)})]})]})},l.id)}),i.overflowCount>0?s.jsx("div",{className:"rounded-xl border border-dashed border-slate-200 bg-slate-50 px-1 py-1 text-center",children:s.jsxs("p",{className:"text-[7px] font-bold text-slate-500",children:["+",i.overflowCount," más"]})}):null]})})]},i.id))})}),s.jsxs("div",{className:"hidden md:flex border-b border-slate-100 bg-slate-50/40",children:[s.jsx("div",{className:"w-16 border-r border-slate-100 flex items-center justify-center bg-slate-100/50",children:s.jsx(rt,{className:"w-4 h-4 text-slate-400"})}),s.jsx("div",{className:S("flex-1 grid divide-x divide-slate-100",o==="professionals"?"grid-cols-7":"grid-cols-4"),children:v.map(i=>s.jsxs("div",{className:"py-3 px-2 text-center",children:["color"in i?s.jsx("div",{className:S("w-9 h-9 rounded-xl mx-auto mb-1.5 flex items-center justify-center text-white font-bold shadow-sm text-sm",i.color),children:i.name[0]}):s.jsx("div",{className:"w-9 h-9 rounded-xl mx-auto mb-1.5 flex items-center justify-center bg-white text-slate-900 border border-slate-200 font-bold shadow-sm text-xs",children:i.name==="Sin asignar"?"—":i.name}),s.jsx("p",{className:"text-[10px] font-bold text-slate-900 uppercase tracking-wider leading-tight",children:i.name}),o==="rooms"&&i.id!=="unassigned"&&s.jsx("p",{className:"text-[9px] text-slate-400 uppercase font-medium mt-0.5",children:"Capacidad 1"})]},i.id))})]}),s.jsx("div",{ref:m,className:"flex-1 overflow-y-auto relative custom-scrollbar",children:s.jsxs("div",{className:"hidden md:flex min-h-[1232px]",children:[s.jsx("div",{className:"w-16 border-r border-slate-100 bg-slate-50/20 sticky left-0 z-20 backdrop-blur-sm",children:Oe.map(i=>s.jsxs("div",{className:"relative h-[88px] border-b border-slate-200/60 flex items-start justify-center pt-2",children:[s.jsxs("span",{className:"text-[10px] font-black text-slate-400",children:[i.toString().padStart(2,"0"),":00"]}),s.jsx("span",{className:"absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200/80"})]},i))}),s.jsx("div",{className:S("flex-1 grid divide-x divide-slate-100 relative",o==="professionals"?"grid-cols-7":"grid-cols-4"),children:v.map(i=>{const l=N(i.id);return s.jsxs("div",{className:"relative h-full cursor-cell transition-colors hover:bg-slate-50/50",children:[Oe.map(d=>s.jsx("div",{className:"relative h-[88px] border-b border-slate-200/60 w-full cursor-cell",onClick:b=>Ge(b,d,i),children:s.jsx("span",{className:"absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200/70"})},d)),l.length===0?s.jsx("div",{className:"absolute inset-0 flex items-center justify-center pointer-events-none",children:s.jsx("div",{className:"px-3 py-2 rounded-xl border border-dashed border-slate-200 bg-white/80 text-[10px] font-bold text-slate-400",children:"Sin turnos"})}):null,l.map(d=>{const b=g.find(D=>D.id===d.professionalId||d.proId),j=$.find(D=>D.id===d.roomId);return s.jsxs(nt.div,{initial:{opacity:0,scale:.96},animate:{opacity:1,scale:1},onClick:D=>{D.stopPropagation(),e(j==null?void 0:j.name,b==null?void 0:b.name,d)},style:{top:`${O(d.start)}px`,height:`${_(d.start,d.end||d.start)}px`},className:S("absolute left-1 right-1 rounded-2xl p-2.5 border shadow-sm group cursor-pointer overflow-hidden transition-all hover:ring-2 ring-blue-100",ee(d.kind||d.type)),children:[s.jsxs("div",{className:"flex items-center justify-between gap-2",children:[s.jsxs("span",{className:"text-[8px] font-black tracking-[0.18em] uppercase px-1.5 py-0.5 rounded-full bg-white/80 text-slate-900 border border-white/80",children:[ge(d.start)," - ",ge(d.end)]}),s.jsx("span",{className:"text-[8px] font-black tracking-widest uppercase opacity-75",children:be(d)})]}),s.jsx("p",{className:"text-[12px] font-bold truncate leading-tight mt-1",children:K(d)}),s.jsxs("p",{className:"text-[10px] font-medium truncate opacity-85 mt-0.5",children:[Z(d.kind||d.type)," · ",p(d)]})]},d.id)})]},i.id)})})]})})]}):s.jsx("div",{className:"flex-1 p-2 md:p-6 overflow-y-auto custom-scrollbar",children:s.jsxs("div",{className:"grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-2xl md:rounded-3xl overflow-hidden",children:[["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"].map(i=>s.jsx("div",{className:"bg-slate-50 py-1 px-1 text-center text-[7px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]",children:i},i)),we({start:H(Fe(r)),end:le(Ye(r))}).map(i=>{const l=te(t.filter(d=>{const b=G(d.date);return b?re(b,i):!1}));return s.jsxs("div",{className:S("min-h-[76px] md:min-h-[140px] bg-white/85 p-1 md:p-2 border-slate-50 transition-colors hover:bg-slate-50/60 cursor-pointer backdrop-blur-sm",!pe(i,r)&&"opacity-30"),onClick:()=>{n(i),f("daily")},children:[s.jsxs("div",{className:"flex items-center justify-between gap-1 mb-1",children:[s.jsx("span",{className:S("text-[10px] md:text-xs font-bold",re(i,new Date)?"w-5 h-5 md:w-6 md:h-6 flex items-center justify-center bg-blue-600 text-white rounded-full":"text-slate-400"),children:P(i,"d")}),l.length>0&&s.jsx("span",{className:"text-[8px] md:text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700",children:l.length})]}),s.jsxs("div",{className:"space-y-1",children:[l.slice(0,2).map(d=>{const b=g.find(D=>D.id===d.professionalId||d.proId),j=$.find(D=>D.id===d.roomId);return s.jsxs("div",{className:S("text-[7px] md:text-[9px] px-1 py-1 rounded-lg font-bold truncate border leading-tight",ee(d.kind||d.type)),children:[s.jsxs("div",{className:"flex items-center justify-between gap-2",children:[s.jsxs("span",{className:"truncate",children:[ge(d.start)," ",K(d)]}),s.jsx("span",{className:"shrink-0 opacity-70",children:be(d)})]}),s.jsxs("div",{className:"mt-0.5 flex items-center justify-between gap-2 text-[7px] font-bold uppercase opacity-70",children:[s.jsx("span",{className:"truncate",children:Z(d.kind||d.type)}),s.jsx("span",{className:"truncate",children:(j==null?void 0:j.name)||(b==null?void 0:b.name)||"Sin asignar"})]})]},d.id)}),l.length>2&&s.jsxs("div",{className:"text-[8px] text-slate-400 font-bold pl-1",children:["+ ",l.length-2," más"]})]})]},i.toISOString())})]})})})]})};export{dr as Agenda};
