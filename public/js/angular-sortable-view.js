/*
 Copyright Kamil Pękala http://github.com/kamilkp
 angular-sortable-view v0.0.13 2015/01/13
 */
!function(a,b){"use strict";function c(a){if(!("clientX"in a||"clientY"in a)){var b=a.touches||a.originalEvent.touches;b&&b.length&&(a.clientX=b[0].clientX,a.clientY=b[0].clientY),a.preventDefault()}}function d(a){if(a=a[0],a.previousElementSibling)return b.element(a.previousElementSibling);for(var c=a.previousSibling;null!=c&&1!=c.nodeType;)c=c.previousSibling;return b.element(c)}function e(a,b){var c=d(a);c.length>0?c.after(b):a.parent().prepend(b)}function f(a,c){return a instanceof b.element&&(a=a[0]),null!==i?a[i](c):void 0}var g=b.module("angular-sortable-view",[]);g.directive("svRoot",[function(){function a(a,b,c){return c?a.x-b.x<0:a.y-b.y<0}function b(a){return g[a]}function c(a){delete g[a]}var d,g=Object.create(null);return{restrict:"A",controller:["$scope","$attrs","$interpolate","$parse",function(h,i,j,k){var l=j(i.svRoot)(h)||h.$id;g[l]||(g[l]=[]);var m,n,o,p,q,r,s=!1,t=k(i.svOnSort);i.svOnStart=i.$$element[0].attributes["sv-on-start"],i.svOnStart=i.svOnStart&&i.svOnStart.value,i.svOnStop=i.$$element[0].attributes["sv-on-stop"],i.svOnStop=i.svOnStop&&i.svOnStop.value;var u=k(i.svOnStart),v=k(i.svOnStop);if(this.sortingInProgress=function(){return d},i.svGrid){if(s="true"===i.svGrid?!0:"false"===i.svGrid?!1:null,null===s)throw"Invalid value of sv-grid attribute"}else h.$watchCollection(function(){return b(l)},function(a){s=!1;var b=a.filter(function(a){return!a.container}).map(function(a){return{part:a.getPart().id,y:a.element[0].getBoundingClientRect().top}}),c=Object.create(null);b.forEach(function(a){c[a.part]?c[a.part].push(a.y):c[a.part]=[a.y]}),Object.keys(c).forEach(function(a){c[a].sort(),c[a].forEach(function(b,d){d<c[a].length-1&&b>0&&b===c[a][d+1]&&(s=!0)})})});this.$moveUpdate=function(c,g,i,j,k,t,v){var w=i[0].getBoundingClientRect();"element"===c.tolerance&&(g={x:~~(w.left+w.width/2),y:~~(w.top+w.height/2)}),d=!0,m=[],n||(k?(n=k.clone(),n.removeClass("ng-hide")):(n=j.clone(),n.addClass("sv-visibility-hidden"),n.addClass("sv-placeholder"),n.css({height:w.height+"px",width:w.width+"px"})),j.after(n),j.addClass("ng-hide"),q=j,o=c,p=i,u(h,{$helper:{element:p},$part:t.model(t.scope),$index:v,$item:t.model(t.scope)[v]}),h.$root&&h.$root.$$phase||h.$apply()),p[0].reposition({x:g.x+document.body.scrollLeft-g.offset.x*w.width,y:g.y+document.body.scrollTop-g.offset.y*w.height}),b(l).forEach(function(b){if(null==c.containment||f(b.element,c.containment)||f(b.element,c.containment+" *")){var d=b.element[0].getBoundingClientRect(),e={x:~~(d.left+d.width/2),y:~~(d.top+d.height/2)};b.container||!b.element[0].scrollHeight&&!b.element[0].scrollWidth||m.push({element:b.element,q:(e.x-g.x)*(e.x-g.x)+(e.y-g.y)*(e.y-g.y),view:b.getPart(),targetIndex:b.getIndex(),after:a(e,g,s)}),b.container&&!b.element[0].querySelector("[sv-element]:not(.sv-placeholder):not(.sv-source)")&&m.push({element:b.element,q:(e.x-g.x)*(e.x-g.x)+(e.y-g.y)*(e.y-g.y),view:b.getPart(),targetIndex:0,container:!0})}});var x=n[0].getBoundingClientRect(),y={x:~~(x.left+x.width/2),y:~~(x.top+x.height/2)};m.push({q:(y.x-g.x)*(y.x-g.x)+(y.y-g.y)*(y.y-g.y),element:n,placeholder:!0}),m.sort(function(a,b){return a.q-b.q}),m.forEach(function(a,b){0!==b||a.placeholder||a.container?0===b&&a.container?(r=a,a.element.append(n)):a.element.removeClass("sv-candidate"):(r=a,a.element.addClass("sv-candidate"),a.after?a.element.after(n):e(a.element,n))})},this.$drop=function(a,b,c){function e(){if(d=!1,n.remove(),p.remove(),q.removeClass("ng-hide"),m=void 0,n=void 0,c=void 0,p=void 0,q=void 0,v(h,{$part:a.model(a.scope),$index:b,$item:a.model(a.scope)[b]}),r){r.element.removeClass("sv-candidate");var e=a.model(a.scope).splice(b,1),f=r.targetIndex;r.view===a&&r.targetIndex>b&&f--,r.after&&f++,r.view.model(r.view.scope).splice(f,0,e[0]),(r.view!==a||b!==f)&&t(h,{$partTo:r.view.model(r.view.scope),$partFrom:a.model(a.scope),$item:e[0],$indexTo:f,$indexFrom:b})}r=void 0,h.$root&&h.$root.$$phase||h.$apply()}if(n)if(c.revert){var f=n[0].getBoundingClientRect(),g=p[0].getBoundingClientRect(),i=Math.sqrt(Math.pow(g.top-f.top,2)+Math.pow(g.left-f.left,2)),j=+c.revert*i/200;j=Math.min(j,+c.revert),["-webkit-","-moz-","-ms-","-o-",""].forEach(function(a){"undefined"!=typeof p[0].style[a+"transition"]&&(p[0].style[a+"transition"]="all "+j+"ms ease")}),setTimeout(e,j),p.css({top:f.top+document.body.scrollTop+"px",left:f.left+document.body.scrollLeft+"px"})}else e()},this.addToSortableElements=function(a){b(l).push(a)},this.removeFromSortableElements=function(a){var d=b(l),e=d.indexOf(a);e>-1&&(d.splice(e,1),0===d.length&&c(l))}}]}}]),g.directive("svPart",["$parse",function(a){return{restrict:"A",require:"^svRoot",controller:["$scope",function(a){a.$ctrl=this,this.getPart=function(){return a.part},this.$drop=function(b,c){a.$sortableRoot.$drop(a.part,b,c)}}],scope:!0,link:function(b,c,d,e){if(!d.svPart)throw new Error("no model provided");var f=a(d.svPart);if(!f.assign)throw new Error("model not assignable");b.part={id:b.$id,element:c,model:f,scope:b},b.$sortableRoot=e;var g={element:c,getPart:b.$ctrl.getPart,container:!0};e.addToSortableElements(g),b.$on("$destroy",function(){e.removeFromSortableElements(g)})}}}]),g.directive("svElement",["$parse",function(a){return{restrict:"A",require:["^svPart","^svRoot"],controller:["$scope",function(a){a.$ctrl=this}],link:function(d,e,f,g){function h(h){function i(a){c(a),n||(e.parent().prepend(q),n=!0),g[1].$moveUpdate(k,{x:a.clientX,y:a.clientY,offset:t},q,e,m,g[0].getPart(),d.$index)}if(c(h),!g[1].sortingInProgress()&&(0==h.button||"mousedown"!==h.type)){n=!1;var k=a(f.svElement)(d);if(k=b.extend({},{tolerance:"pointer",revert:200,containment:"html"},k),k.containment)var p=j.call(e,k.containment)[0].getBoundingClientRect();var q,r=e,s=e[0].getBoundingClientRect();l||(l=g[0].helper),m||(m=g[0].placeholder),l?(q=l.clone(),q.removeClass("ng-hide"),q.css({left:s.left+document.body.scrollLeft+"px",top:s.top+document.body.scrollTop+"px"}),r.addClass("sv-visibility-hidden")):(q=r.clone(),q.addClass("sv-helper").css({left:s.left+document.body.scrollLeft+"px",top:s.top+document.body.scrollTop+"px",width:s.width+"px"})),q[0].reposition=function(a){var b=a.x,c=a.y,d=q[0].getBoundingClientRect(),e=document.body;p&&(c<p.top+e.scrollTop&&(c=p.top+e.scrollTop),c+d.height>p.top+e.scrollTop+p.height&&(c=p.top+e.scrollTop+p.height-d.height),b<p.left+e.scrollLeft&&(b=p.left+e.scrollLeft),b+d.width>p.left+e.scrollLeft+p.width&&(b=p.left+e.scrollLeft+p.width-d.width)),this.style.left=b-e.scrollLeft+"px",this.style.top=c-e.scrollTop+"px"};var t={x:(h.clientX-s.left)/s.width,y:(h.clientY-s.top)/s.height};o.addClass("sv-sorting-in-progress"),o.on("mousemove touchmove",i).on("mouseup touchend touchcancel",function u(){o.off("mousemove touchmove",i),o.off("mouseup touchend",u),o.removeClass("sv-sorting-in-progress"),n&&g[0].$drop(d.$index,k),e.removeClass("sv-visibility-hidden")})}}var i={element:e,getPart:g[0].getPart,getIndex:function(){return d.$index}};g[1].addToSortableElements(i),d.$on("$destroy",function(){g[1].removeFromSortableElements(i)});var k=e;k.on("mousedown touchstart",h),d.$watch("$ctrl.handle",function(a){a&&(k.off("mousedown touchstart",h),k=a,k.on("mousedown touchstart",h))});var l;d.$watch("$ctrl.helper",function(a){a&&(l=a)});var m;d.$watch("$ctrl.placeholder",function(a){a&&(m=a)});var n,o=(b.element(document.body),b.element(document.documentElement))}}}]),g.directive("svHandle",function(){return{require:"?^svElement",link:function(a,b,c,d){d&&(d.handle=b.add(d.handle))}}}),g.directive("svHelper",function(){return{require:["?^svPart","?^svElement"],link:function(a,b,c,d){b.addClass("sv-helper").addClass("ng-hide"),d[1]?d[1].helper=b:d[0]&&(d[0].helper=b)}}}),g.directive("svPlaceholder",function(){return{require:["?^svPart","?^svElement"],link:function(a,b,c,d){b.addClass("sv-placeholder").addClass("ng-hide"),d[1]?d[1].placeholder=b:d[0]&&(d[0].placeholder=b)}}}),b.element(document.head).append(["<style>.sv-helper{position: fixed !important;z-index: 99999;margin: 0 !important;}.sv-candidate{}.sv-placeholder{}.sv-sorting-in-progress{-webkit-user-select: none;-moz-user-select: none;-ms-user-select: none;user-select: none;}.sv-visibility-hidden{visibility: hidden !important;opacity: 0 !important;}</style>"].join(""));var h=document.documentElement,i=h.matches?"matches":h.matchesSelector?"matchesSelector":h.webkitMatches?"webkitMatches":h.webkitMatchesSelector?"webkitMatchesSelector":h.msMatches?"msMatches":h.msMatchesSelector?"msMatchesSelector":h.mozMatches?"mozMatches":h.mozMatchesSelector?"mozMatchesSelector":null;if(null==i)throw"This browser doesn't support the HTMLElement.matches method";var j=b.element.prototype.closest||function(a){for(var c=this[0].parentNode;c!==document.documentElement&&!c[i](a);)c=c.parentNode;return c[i](a)?b.element(c):b.element()};"function"!=typeof b.element.prototype.add&&(b.element.prototype.add=function(a){var c,d=b.element();for(a=b.element(a),c=0;c<this.length;c++)d.push(this[c]);for(c=0;c<a.length;c++)d.push(a[c]);return d})}(window,window.angular);
