/*
  Auther:f7
  Date:2013.8
  Editor: 201401120
  Versions:1.0.5
        为添加的父节点加上overflow:hidden，修正部分手机不能正常滑屏BUG
  Versions:1.0.4
        修复BUG：单点到多点【多点为整个屏幕范围内】BUG修复
        修复BUG：鼠标或手指滑动到节点之外放，滑动开依然生效
  Versions:1.0.3  20130910
        修复BUG：当单点触控被多点触控打断时，视为本次滑动无效
        修复BUG：限制最大宽时reset宽高处理
  Versions:1.0.2  20130909
        增加history属性来记录浏览历史，让浏览器前进后退生效
  Versions:1.0.1  20130906
        增加height属性来保证分页高度不同时立刻修正模块的显示高度，避免按最高模块计算产生的空白区域
        增加ratio属性来保证横竖屏切换时图片高度等比率缩放，另外，CSS中给图片及祖先元素设置100%高度，响应式宽度变化时高度等比率缩放
*/
(function(win, d) {

    /**
     * 触屏左右滑动效果
     * @param {HTMLElement} elem 放置内容的节点
     * @param {Object} o 其他参数
     * 
     * @config {[Number]} [speed] 速率 默认 300ms
     * @config {[Number]} [index] 初始化索引
     * @config {[String]} [createtag] 创建动画节点的标签名 默认 div
     * @config {[Boolean]} [loop] 是否需要重复滚动
     * @config {[Number]} [threshold] 滑动多少距离生效，默认 25px
     * @config {[Number]} [range] 滚动范围
     * @config {[Function]} [ready] 准备就绪的回调 接受this参数
     * @config {[Function]} [end] 每次滚动结束的回调 接受this参数
     * @config {[Function]} [resize] 窗口变化||横竖屏切换完成的回调 接受this参数
     * @config {[Boolean]} [auto] 是否自动滚动 默认 false 【慎用，手机端可能扛不住】
     * @config {[Boolean]} [height] 是否自动设置模块高度 默认 false 【分页高度不同时立刻修正模块的显示高度，避免按最高模块计算产生的空白区域】
     * @config {[String]} [ratio] 保证横竖屏切换时图片高度等比率缩放，另外，CSS中给图片及祖先元素设置100%高度，响应式宽度变化时高度等比率缩放 示例："ratio":"275/195"
     * @config {[Boolean]} [history] 是否需要记录浏览历史，默认为false 不记录
     * @config {[Number]} [suspend] 自动滚动时的间歇时间 默认 3000
     */
    function TouchSlide ( elem, o ) {
        this.versions = "1.0.5";
        if ( !(this instanceof TouchSlide) ) {
            return new TouchSlide( elem, o );
        };
        if ( typeof(elem) == "string" && elem.indexOf("#") >= 0 ) {
            elem = elem.replace("#", "");
        };
        this.elem = typeof(elem)=="object" ? elem : d.getElementById(elem);// 盒子节点
        this.moveElem = "";// 组件自己创建的用作动画的节点
        this.o = o || {};
        this.speed = this.o.speed || 300;// 速率 默认 300ms
        this.index = this.o.index || 0;// 当前分页
        this.range = 0;// 当前屏幕的滚动范围
        this.zoom = false;// 滚动范围是否随着横竖屏切换而变化，默认 false
        this.items = [];// 子节点集合
        this.createtag = this.o.createtag || "div";// 要创建包含层的节点名称
        this.loop = this.o.loop || false;// 是否需要重复滚动
        this.threshold = this.o.threshold || 25;// 滑动多少距离生效，默认25px
        this.auto = this.o.auto || false;// 是否自动滚动 默认 false
        this.height = this.o.height || false;// 是否自动设置模块高度 默认 false
        this.ratio = this.o.ratio || "";// 模块按照图片比率设置高度 示例："ratio":"275/195"
        this.history = this.o.history || false;// 是否产生访问历史记录 默认 false
        this.autoFlag = true;
        this.suspend = this.o.suspend || 3000;// 自动滚动时的间歇时间 默认 3000
        this.init();
    };

    TouchSlide.prototype.getStyle = function (elem, key) {
        var value = elem.style[key];
        if ( !value ) {
            var style = elem.currentStyle || getComputedStyle(elem, null);
            value = style[key];
        };
        return value;
    };

    /**
     * 初始化相关参数 及启动效果
     * @return
     */
    TouchSlide.prototype.init = function() {
        if ( !this.elem ) { return false };
        // var winWidth = self.innerWidth||( d.documentElement && d.documentElement.offsetWidth )||d.body.offsetWidth,
        var winWidth = d.body.offsetWidth,
            _width = this.elem.offsetWidth;
        if ( this.history ) {// 记录历史的情况下让历史优先
            this.index = this.urlParam(window.location.href, "touchslidepage") || this.index;
        };

        if ( this.o.range ) {
            if ( this.o.range > winWidth ) {
                this.range = winWidth;
                this.zoom = true;
            } else {
                this.range = this.o.range;
            };
        } else {
            if ( _width >= winWidth ) {
                this.range = winWidth;
                this.zoom = true;
            } else {
                this.range = _width;
            };
        };


        this.setbox();// 初始化盒子

        this.addevent();// 初始化滑动事件

        this.amendHeight(this.index);// 初始化完毕时处理高度问题

        this.setHistory();// 记录历史【函数内有判断是否记录】

        // 准备就绪后的回调
        if ( this.o.ready ) {
            this.o.ready(this);
        };

        this.action();// 初始化自动滑动
    };

    /**
     * 设置盒子的布局
     * @return
     */
    TouchSlide.prototype.setbox = function() {
        var data = this.elem.innerHTML,
            _inner = d.createElement(this.createtag),
            _last, _first,
            count = 0,
            transitionValue,
            translateValue,
            that = this,
            nodes;
        this.elem.innerHTML = "";
        _inner.innerHTML = data;
        
        this.elem.appendChild(_inner);
        this.moveElem = _inner;
        this.moveElem.style.overflow = "hidden";
        
        // 收集子元素
        if ( this.items.length == 0 ){
            nodes = this.moveElem.childNodes;
            for ( var i=0,l=nodes.length; i<l; i++ ) {
                if ( nodes[i].nodeType == 3 || nodes[i].nodeType == 8 ) {
                    continue;
                };
                this.items.push(nodes[i]);
            };
        };
        count = this.items.length;

        for ( var i=0,l=count; i<l; i++ ) {
            this.items[i].style.width = this.range +"px";
        };

        if ( this.index >= count ) {
            this.index = count - 1;
        };

        translateValue = "translate("+ -(this.range * this.index) +"px, 0)";
        // 循环拖拽的设置
        if ( this.loop ) {
            _last = this.items[count-1].cloneNode(true);
            _first = this.items[0].cloneNode(true);
            this.moveElem.insertBefore(_last, this.items[0]);
            this.moveElem.appendChild(_first);
            count += 2;
            translateValue = "translate("+ -(this.range * (this.index + 1)) +"px, 0)";
        };
        // 修正起始点
        this.setTranslate(translateValue);

        transitionValue = this.speed + "ms";
        this.moveElem.style.width = count * this.range + "px";
        this.setTransition(transitionValue);

        // 有比例ratio参数存在时，修正显示高度
        if ( this.ratio && this.ratio.indexOf("/") > 0 ) {
            var __w = this.ratio.substring(0, this.ratio.indexOf("/")),
                __h = this.ratio.replace(__w + "/", "");
            this.moveElem.style.height = (this.range * parseInt(__h)) / parseInt(__w) + "px";
            for ( var i=0,l=count; i<l; i++ ) {
                this.items[i].style.height = "100%";
            };
        };
    };

    /**
     * 跳至第几页
     * @param  {Number} count 数字
     * @return
     */
    TouchSlide.prototype.goto = function(count, flag) {// flag 为true时不执行 that.o.end
        var translateValue,
            all = this.items.length,
            that = this;

        if ( !this.loop ) {
            if ( count >= all ) {
                count = all - 1;
            };
            if ( count <= 0 ) {
                count = 0;
            };

            translateValue = "translate("+ -(this.range * count) +"px, 0)";
        } else {// 可重复滑动的处理
            if ( count > all ) {// 为本次滚动设置count
                count = all;
            };
            if ( count <= -1 ) {
                count = -1;
            };
            
            translateValue = "translate("+ -(this.range * (count + 1)) +"px, 0)";
            
            // 循环到头时修正位置
            if ( count == -1 || count == all ) {
                count == -1 ? count = this.items.length - 1 : count = 0;
                this.index = count;
                // 滑动结束修正位置
                setTimeout(function(){
                    that.resetLoopTranslate();
                }, this.speed);
            };
        };
        
        this.setTranslate(translateValue);
        this.index = count;

        this.amendHeight(this.index);// 滑动完毕时处理高度问题
        if ( !flag || flag != "history" ) {// flag为history时代表前进后退执行，不记录历史
            this.setHistory();// 记录访问历史
        };
        
        // 完成一次引动的回调
        if ( this.o.end && (!flag || flag != "reset") ) {// flag为reset时代表窗口变化时修正，不执行回调
            this.o.end(that);
        };
    };

    /**
     * 仅在循环滑动时才会调用的充值循环边界参数
     * @return {[type]} [description]
     */
    TouchSlide.prototype.resetLoopTranslate = function() { 
        var transitionValue = this.speed + "ms",
            translateValue,
            that = this;
        if ( this.index == this.items.length - 1 ) {
            this.setTransition("none");

            translateValue = "translate("+ -(this.range * (this.index + 1)) +"px, 0)";
            this.setTranslate(translateValue);

            setTimeout(function(){
                that.setTransition(transitionValue);
            }, 10);
            
        };
        if ( this.index == 0 ) {
            this.setTransition("none");

            translateValue = "translate("+ -this.range +"px, 0)";
            this.setTranslate(translateValue);

            setTimeout(function(){
                that.setTransition(transitionValue);
            }, 10);
            
        };
    };

    /**
     * 设置CSS3动画时间
     * @param {String} val Transition的值
     */
    TouchSlide.prototype.setTransition = function(val) {
        this.moveElem.style.WebkitTransition = val;
        this.moveElem.style.MozTransition = val;
        this.moveElem.style.OTransition = val;
        this.moveElem.style.transition = val;
    };

    /**
     * 设置CSS3位置偏移
     * @param {String} val Translate及参数
     */
    TouchSlide.prototype.setTranslate = function(val) {
        this.moveElem.style.WebkitTransform = val;
        this.moveElem.style.MozTransform = val;
        this.moveElem.style.OTransform = val;
        this.moveElem.style.transform = val;
    };

    /**
     * 下一页
     * @return
     */
    TouchSlide.prototype.next = function() {
        var count = this.index+1;
        this.goto(count);
    };

    /**
     * 上一页
     * @return
     */
    TouchSlide.prototype.prev = function() {
        var count = this.index-1;
        this.goto(count);
    };

    /**
     * 添加滑动事件
     * @return
     */
    TouchSlide.prototype.addevent = function() {
        var that = this,
            x,
            y,
            elemX,
            transitionValue = this.speed + "ms",
            cro = 0,
            flag = false;// 因为启用了document.ontouchmove，所以防止滑动非本模块时产生移动
        
        win.addEventListener("resize", function(){that.winresize()}, false);// 横竖屏切换或改变窗口大小时处理

        this.moveElem.addEventListener("mousedown", start, false);
        this.moveElem.addEventListener("click", clear, false);
        this.moveElem.addEventListener("mouseup", end, false);
        this.moveElem.addEventListener("mouseout", end, false);
        this.moveElem.ontouchstart = start;
        this.moveElem.ontouchend = end;
        
        function clear() {};
        function start(e) {
            var reg = /-?[0-9]+/g,
                translate = this.style.webkitTransform || this.style.mozTransform || this.style.oTransform || this.style.transform;
            flag = true;

            if ( that.auto && that.autoFlag ) { that.stop() };// 停止动画 拖动结束后会重新启动

            if ( !e.targetTouches ) {// 阻止PC端事件冒泡
                e.preventDefault();
            };

            // elemX = parseInt(reg.exec(translate)[0]);
            elemX = parseInt(translate.substring(translate.indexOf("translate") + 10, translate.indexOf("px")));

            x = e.clientX || e.targetTouches[0].pageX;
            y = e.clientY || e.targetTouches[0].pageY;
            that.setTransition("none");
            document.addEventListener("mousemove", move, false);
            // this.ontouchmove = move;
            document.ontouchmove = move;

            cro = 0;
        };
        function end(e) {
            var _x = e.clientX || e.changedTouches[0].pageX;

            flag = false;

            // 恢复动画
            that.setTransition(transitionValue);

            // 检测是否需要翻页
            if ( cro == 1 ) {
                that.moveAnalysis(_x - x);
            };

            if ( that.auto && that.loop && !that.autoFlag ) { that.start() };// 重新启动动画
            
            document.removeEventListener("mousemove", move, false);
            that.moveElem.removeEventListener("mouseout", end, false);
            document.removeEventListener("touchmove", move, false);
            that.moveElem.removeEventListener("touchend", end, false);

            document.removeEventListener("mouseup", end, false);
        };
        function move(e) {
            var newX = e.clientX || e.targetTouches[0].pageX,
                newY = e.clientY || e.targetTouches[0].pageY,
                translateValue = "translate("+ (newX - x + elemX) +"px, 0)",
                rangeX = newX - x,
                rangeY = newY - y;
            rangeX < 0 ? rangeX *= -1 : rangeX;
            rangeY < 0 ? rangeY *= -1 : rangeY;
            
            // document.getElementById("count").innerHTML = "touches:"+ e.touches.length +"targetTouches:"+ e.targetTouches.length +"changedTouches:"+ e.changedTouches.length;
            
            document.addEventListener("mouseup", end, false);

            if ( e.touches && e.touches.length > 1 ) {// 发生多点触控时浏览器会终止move，我们认为用户并不想切换，所以返回滑动前状态
                that.goto(that.index);
                return false;
            };

            if ( rangeX > rangeY && cro == 0 ) {
                cro = 1;
                e.preventDefault();
            };
            if ( rangeX < rangeY && cro == 0 ) {
                cro = 2;
            };

            if ( cro == 1 && flag ) {// 横向滑动
                that.setTranslate(translateValue);
            };

            if ( cro == 2 ) {// 非横向
                e.cancelable = false;
            };
            
            // test
            // $("#count")[0].innerHTML += elemX + " ";
        };

        // 记录history时注册的事件
        if ( this.history ) {
            window.addEventListener("hashchange", function(){
                var up = that.urlParam(window.location.href, "touchslidepage");
                if ( up != that.index ) {
                    that.goto(parseInt(up), "history");
                };
            }, false);
        };
    };

    /**
     * 滑动范围解析器【检测是否需要翻页】
     * @param  {Number} range 滑动的范围
     * @return
     */
    TouchSlide.prototype.moveAnalysis = function(range) {
        if ( range > this.threshold ) {
            // 向左
            this.prev();
        } else if ( range < -this.threshold ) {
            // 向右
            this.next();
        } else {
            this.goto(this.index);
        };
    };

    /**
     * 自动滑动
     * @return
     */
    TouchSlide.prototype.action = function() {
        var that = this;
        
        if ( this.auto && !this.loop && that.index == (this.items.length - 1) ) {// 不循环自动滑动的处理
            setTimeout(function() {
                that.goto(0);
                that.stop();
            }, this.suspend + this.speed);
            return false;
        };

        if ( this.auto && this.autoFlag ) {
            this.timer = setTimeout(function() {
                clearTimeout(that.timer);
                that.next();
                that.action();
            }, this.suspend + this.speed);
        };
    };

    /**
     * 横竖屏切换/窗口大小变化时重置相关参数
     * @return
     */
    TouchSlide.prototype.winresize = function() {
        var that = this;
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(function(){
            var winWidth = d.body.offsetWidth,
                count = that.items.length,
                elemWidth = that.elem.offsetWidth,
                nodes;

            if ( that.range > winWidth ) {
                that.zoom = true;
            };

            if ( !that.zoom ) { return false };
            if ( winWidth == that.range ) { return false };
            
            if ( elemWidth != winWidth ) {// 有最大宽度时的设置
                that.range = elemWidth;
            } else {
                that.range = winWidth;
            };
            
            if ( that.loop ) {
                count += 2;
            };
            that.moveElem.style.width = count * that.range + "px";
            nodes = that.moveElem.childNodes;
            for ( var i=0,l=nodes.length; i<l; i++ ) {
                if ( nodes[i].nodeType == 3 || nodes[i].nodeType == 8 ) {
                    continue;
                };
                nodes[i].style.width = that.range + "px";
            };

            // 有比例ratio参数存在时，修正显示高度
            if ( that.ratio && that.ratio.indexOf("/") > 0 ) {
                var __w = that.ratio.substring(0, that.ratio.indexOf("/")),
                    __h = that.ratio.replace(__w + "/", "");
                that.moveElem.style.height = (that.range * parseInt(__h)) / parseInt(__w) + "px";
            };

            that.goto(that.index, "reset");
            
            if ( that.o.resize ) {
                that.o.resize(that);
            };
        }, 100);
    };

    /**
     * 变化中处理高度问题
     * @return
     */
    TouchSlide.prototype.amendHeight = function(i) {
        if ( !this.height ) { return false };
        var elem = this.items[i],
        _height = elem.clientHeight;
        this.elem.style.height = _height + "px";
        this.elem.style.overflow = "hidden";
    };

    /**
     * 读取/设置URL参数
     * @return
     */
    TouchSlide.prototype.urlParam = function ( url , name , value ) {
        var reg = new RegExp("(^|\\#|&)"+ name +"=([^&]*)(\\s|&|$)", "i"),
            m = url.match( reg );
        if ( typeof(value) != 'undefined' ) { //赋值
            if( m ){
                return url.replace(reg,function($0,$1,$2) {
                    return $0.replace($2,value);
                });
            } else {
                if ( url.indexOf('#') == -1 ) {
                    return (url+'#'+name+'='+value);
                } else {
                    return (url+'&'+name+'='+value);
                };
            };
        } else { //取值
            return m ? m[2] : '';
        };
    };

    /**
     * 记录浏览历史
     * @return
     */
    TouchSlide.prototype.setHistory = function() {
        if ( !this.history ) { return false };
        window.location = this.urlParam(window.location.href, "touchslidepage", this.index);
    };
    

    /**
     * 停止滚动
     * @return
     */
    TouchSlide.prototype.stop = function() {
        clearTimeout(this.timer);
        this.autoFlag = false;
    };

    /**
     * 启动滚动
     * @return
     */
    TouchSlide.prototype.start = function() {
        this.autoFlag = true;
        this.action();
    };

    win.TouchSlide = TouchSlide;

})(window, document);