/**!
 *jquery.table.js插件
 * table 配置项:
 * - debug:true/false 调试的时候打开,默认false；
 * - url data加载数据的url 必填 默认""
 * - formId 绑定form的id 默认'formSearch'
 * - method post/get 默认get
 * - idField 主键字段 默认id
 * - singleSelect true/false 默认false是否单选
 * column:配置项目:
 *
 * -field 字段
 * -formatter:格式化输出字段函数,第一个参数是这个字段的value，第二个是这个实体的json对象
 * -sortable :true/false 默认false，如果为true 该字段可以点击排序
 * -column 排序字段，如果column为空且sortable为true，使用field字段参与后台sql排序
 * 常用方法:
 *
 * - getData 获得从后台加载的分页数据
 * - checkSelect 检查是否有选择中的checkbox 返回选择的checkbox个数
 * - getSelectValue 获得被选择列的主键如果没有被选择返回null
 * - getSelectItem 获得被选择列的数据，即一个实体对应的json对象
 * - getSelectValues (多选) 获得选择列的主键数组，如果没有选择任何列，返回空数组；
 * - getSelectItem (多选)获得被选择列的全部数据，即多个试题json数组；如果没有选择，返回空数组；
 * - reload 重新加载数据 当前页保持不变
 * - load 重新加载数据 currentPage=1
 * 事件：
 * onClickRow 在用户点击一行的时候触发，参数包括：index：点击的行的索引值，该索引值从0开始。row：对应于点击行的记录。
 * 样例：
 * <pre>
 *     if ($("#tableShower").table("checkSelect")) {
 *         var id = $("#tableShower").table("getSelectValue");
 *         console.log("getSelectValue获得选中的id:"+id);
 *         var ids = $("#tableShower").table("getSelectValues");
 *         console.log("getSelectValues获得选中的id列表:");
 *         console.log(JSON.stringify(ids));
 *         var item = $("#tableShower").table("getSelectItem");
 *         console.log("getSelectItem获得选中的item内容:");
 *         console.log(JSON.stringify(item));
 *         var items = $("#tableShower").table("getSelectItems");
 *         console.log("getSelectItems获得选中的多个items内容:");
 *         console.log(JSON.stringify(items));
 *     } else {
 *         alert("请你至少选择一条记录！");
 *     }
 * </pre>
 *
 *  @author walden
 */
(function ($) {
    /**
     * 辅助字符串方法
     * @param args
     * @returns {String}
     */
    String.prototype.format = function (args) {
        var result = this;
        if (arguments.length > 0) {
            if (arguments.length == 1 && typeof (args) == "object") {
                for (var key in args) {
                    if (args[key] != undefined) {
                        var reg = new RegExp("({" + key + "})", "g");
                        result = result.replace(reg, args[key]);
                    }
                }
            } else {
                for (var i = 0; i < arguments.length; i++) {
                    if (arguments[i] != undefined) {
                        var reg = new RegExp("({)" + i + "(})", "g");
                        result = result.replace(reg, arguments[i]);
                    }
                }
            }
        }
        return result;
    }
    $.fn.table = function (options, param) {
        //使用方法
        if (typeof options == 'string') {
            return $.fn.table.methods[options](this, param);
        }
        return this.each(function () {
            var $this = $(this);
            var state = $this.data("table");
            if (state) {
                $.extend(state.options, options);
            } else {
                var columns = parseColumnsOptions($this, $.fn.table.defaults);
                options = $.extend({}, $.fn.table.defaults, parseOptions($this.attr("data-options")), {columns: columns}, options);
                $this.data("table", {options: options});
            }
            if (!$this.data("loading")) {
                $this.before(options.loadingFrag);
                $this.data("loading", true);
            }
            ajaxPageGo($this);
            $this.data("ajaxPageGo", ajaxPageGo);
        });

        /**
         * 解析节点的data-options为json对象
         * @param options
         * @returns {Object}
         */
        function parseOptions(options) {
            return eval("({" + (options || "") + "})");
        }

        function parseColumnsOptions($target, options) {
            var $theadTr = $target.find("tr:first");
            var columns = new Array();
            $theadTr.find("th").each(function (i, t) {
                var $this = $(this);
                var dataOptions = parseOptions($this.attr("data-options"));
                columns.push(dataOptions);
                if (dataOptions["sortable"]) {
                    $this.addClass(options.sortCls).click(function () {
                        var column = dataOptions['column'] || dataOptions['field'];
                        if (options.orderbyColumn && options.orderbyColumn == column) {
                            options.orderbyDirection = options.orderbyDirection ? 0 : 1;
                        } else {
                            options.orderbyDirection = 1;
                        }
                        options.orderbyColumn = column;
                        $theadTr.find("th." + options.sortCls).removeClass(options.ascCls + " " + options.descCls);
                        $this.addClass(options.orderbyDirection ? options.descCls : options.ascCls);
                        ajaxPageGo($target);
                    });
                }
            });
            return columns;
        }

        function ajaxPageGo($target) {
            var options = $target.data("table").options;
            var $loading = $target.prev(".loading");
            var formParams = {};
            var $form = $("#" + options.formId);
            if ($form.length) {
                var params = $form.serializeArray();
                for (var i = 0; i < params.length; ++i) {
                    var param = params[i];
                    formParams[param["name"]] = param["value"];
                }
            }
            var orderBy = {};
            if (options.orderbyColumn) {
                orderBy = {
                    "orderBy.column": options.orderbyColumn,
                    "orderBy.direction": options.orderbyDirection
                };
            }
            $.ajax({
                url: options.url,
                dataType: 'json',
                async: true,
                cache: options.cache,
                type: options.method,
                beforeSend: function () {
                    $loading.show();
                },
                complete: function () {
                    $loading.hide();
                },
                data: $.extend(formParams, {
                    pageNum: options.currentPage,
                    pageSize: options.pageSize

                }, orderBy),
                success: function (res) {
                    if (res.success) {
                        var data = res.data;
                        //第一次的总条数
                        if (!options.firstTotal) {
                            options.firstTotal = data.total;
                        }
                        $target.data("data", data);
                        var pageData = {};
                        //渲染数据
                        var trArr = new Array();
                        if (data && data.list.length) {
                            for (var d = 0; d < data.list.length; ++d) {
                                var item = data.list[d];
                                var id = item[options.idField];
                                trArr.push("<tr class='text-c' id=" + id + ">");
                                //渲染数据
                                for (var i = 0; i < options.columns.length; ++i) {
                                    var tdOptions = options.columns[i];
                                    var checkbox = tdOptions["checkbox"];
                                    var field = tdOptions['field'];
                                    var formatter = tdOptions['formatter'];
                                    var title = tdOptions['title'];
                                    var tdStyle = tdOptions['tdStyle'] ? tdOptions['tdStyle'] : '';
                                    var text = "";
                                    if (formatter) {
                                        if ($.fn.table.formatters[formatter]) {
                                            text = $.fn.table.formatters[formatter](item[field], item, d);
                                        } else {
                                            text = formatter(item[field], item, i);
                                        }
                                    } else {
                                        var fieldVal = item[field];
                                        if (fieldVal == null) {
                                            text = "-"; //为空的时候显示-
                                        } else if (typeof fieldVal == "string") {
                                            text = escapeHtml(fieldVal);
                                        } else {
                                            text = fieldVal;
                                        }
                                    }
                                    if (options.idField == field) {
                                        if (checkbox) {
                                            text = '<input type="checkbox" value="' + text + '" name="' + options.idField + '" class="checkCls">';
                                        }
                                        pageData[id] = item;
                                    }
                                    trArr.push("<td {0}><div field='{2}' style='{3}'>{1}</div></td>".format(title ? 'title="{0}"'.format(escapeHtml(text)) : "", text,field,tdStyle));
                                }
                                trArr.push("</tr>");
                            }
                            $target.find("tr:not(:first)").remove().end().append(trArr.join(''));
                            //添加单选事件
                            if (options.singleSelect) {
                                $target.find(":checkbox").unbind().click(function () {
                                    if ($(this).is(":checked")) {
                                        $target.find(":checkbox").not(this).removeAttr("checked");
                                    }
                                });
                            }
                            $target.find("tr:not(:first)").click(function () {
                                var index = $target.find("tr:not(:first)").index(this);
                                options.onClickRow(index, pageData[$(this).attr("id")]);
                            });
                            //分页器重建
                            var $pager = $target.next("div.center");
                            if ($pager.length) {
                                $pager.remove();
                            }
                            $target.after(showPager(data, options));
                            //给分页器添加点击事件
                            $pager = $target.next("div.center");
                            $pager.find("a").click(function () {
                                var pageNum = $(this).attr("data-pageNum");
                                if (pageNum) {
                                    options.currentPage = pageNum;
                                    ajaxPageGo($target);
                                }
                            });
                            $pager.find("input.goButton").click(function () {
                                var pageNum = parseInt($(this).prev("input.goInput").val() || 1);
                                var pageRange = $(this).attr("data-pageRange").split(",");
                                var firstPage = pageRange[0], lastPage = pageRange[1];
                                if (pageNum < firstPage) pageNum = firstPage;
                                if (pageNum > lastPage) pageNum = lastPage;
                                options.currentPage = pageNum;
                                ajaxPageGo($target);
                            });
                            $pager.find("select.pageSizeSelecter").change(function () {
                                options.currentPage = 1;
                                options.pageSize = $(this).val();
                                ajaxPageGo($target);
                            }).val(data.pageSize);
                            //处理分页
                            if (data.orderBy) {
                                var orderBy = data.orderBy.split(" ");
                                options.orderbyColumn = orderBy[0];
                                options.orderbyDirection = orderBy[1] == "desc" ? 1 : 0;
                            }
                            //缓存数据
                            $target.data("pageData", pageData);
                        } else {
                            var trNoData = '<tr><td colspan="{0}"><div>{1}</div></td></tr>'.format(options.columns.length, options.noDataTips);
                            $target.find("tr:not(:first)").remove().end().append(trNoData);
                            //移除分页器
                            $target.next("div." + options.pagerClass).remove();
                        }
                        //添加渲染后回调函数
                        if (options.afterTableRender) {
                            options.afterTableRender($target);
                        }
                    } else {
                        alert("加载table数据失败:" + res.message);
                    }
                },
                error: function (err) {
                    console.log("Ajax加载数据出错:" + err);
                }
            });
        }

        /**
         * 表格输出值的时候 过滤掉大于好小于号
         * @param str
         * @returns {string}
         */
        function escapeHtml(str) {
            return (str || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }

        function showPager(pager, options) {
            var pagerArr = new Array();
            pagerArr.push('<div class="{0}">'.format("center"));
            pagerArr.push('<ul class="{0}">'.format(options.pagerClass));

            //渲染首页
            if (!pager.isFirstPage && pager.total)
                pagerArr.push('<li><a href="javascript:;" data-pagenum="1" class="leftRadius" title="1">首页</a></li>');
            //渲染上一页
            if (pager.hasPreviousPage)
                pagerArr.push('<li><a href="javascript:;" data-pagenum="{0}" title="上一页">«</a></li>'.format(pager.prePage));
            //渲染分页索引块
            for (var i = 0; i < pager.navigatepageNums.length; ++i) {
                if (pager.navigatepageNums[i] == pager.pageNum) {
                    var classStr = "";
                    //首页不显示 第一页加左边圆角
                    if (pager.isFirstPage) {
                        classStr += " leftRadius";
                    }
                    //尾页不显示 最后一页加游遍圆角
                    if (pager.isLastPage) {
                        classStr += " rightRadius";
                    }
                    pagerArr.push('<li><a href="javascript:;" class="active {1}">{0}</a></li>'.format(pager.navigatepageNums[i], classStr));
                } else {
                    pagerArr.push('<li><a href="javascript:;" data-pagenum="{0}">{0}</a></li>'.format(pager.navigatepageNums[i]));
                }
            }
            //pagerArr.push('<li>ef="javascript:;" data-pagenum="4">...</a>');
            //渲染下一页
            if (pager.hasNextPage)
                pagerArr.push('<li><a href="javascript:;" data-pagenum="{0}"  title="下一页">»</a></li>'.format(pager.nextPage));
            //渲染尾页
            if (!pager.isLastPage && pager.total)
                pagerArr.push('<li><a href="javascript:;" data-pagenum="{0}" class="rightRadius" title="共{0}页">尾页</a></li>'.format(pager.pages));
            if (options.enableGotoPage) {
                pagerArr.push('<input type="text" class="goInput" size="2">');
                pagerArr.push('<input type="button" class="goButton" value="GO" data-pagerange="{0},{1}">'.format(1, pager.pages));
            }
            pagerArr.push('<li><a href="javascript:;" class="totalPage">共<font>{0}</font>条</a></li>'.format(pager.total));

            pagerArr.push('</ul>');
            pagerArr.push('</div>');
            return pagerArr.join('');
        }


    };
    $.fn.table.formatters = {
        numberFormatter: function (val, row, index) {
            return index + 1;
        }
    }
    $.fn.table.methods = {
        getData: function (jq) {
            return jq.data('data');
        },
        checkSelect: function (jq) {
            var opts = jq.data("table").options;
            return jq.find(":checked." + opts.checkCls).length;
        },
        getSelectValue: function (jq) {
            var opts = jq.data("table").options;
            return jq.find(":checked." + opts.checkCls)[0].value || null;
        },
        getSelectValues: function (jq) {
            var opts = jq.data("table").options;
            var values = new Array();
            jq.find(":checked." + opts.checkCls).each(function () {
                values.push(this.value);
            });
            return values;
        },
        getSelectItem: function (jq) {
            var opts = jq.data("table").options;
            var tableData = jq.data("pageData");
            return tableData[jq.find(":checked." + opts.checkCls)[0].value] || null;
        },
        getSelectItems: function (jq) {
            var opts = jq.data("table").options;
            var items = new Array();
            var tableData = jq.data("pageData");
            jq.find(":checked." + opts.checkCls).each(function () {
                items.push(tableData[this.value]);
            });
            return items;
        },
        getRowById: function (jq, param) {
            var opts = jq.data("table").options;
            var tableData = jq.data("pageData");
            return tableData[param] || null;
        },
        reload: function (jq) {
            var ajaxPageGo = jq.data("ajaxPageGo");
            var options = jq.data("table").options;
            ajaxPageGo(jq);
        },
        load: function (jq, params) {
            var ajaxPageGo = jq.data("ajaxPageGo");
            var options = jq.data("table").options;
            options.currentPage = 1;
            options = $.extend(options, params);
            ajaxPageGo(jq);
        }
    };
    $.fn.table.defaults = {
        debug: false,
        url: "",
        formId: "formSearch",
        method: 'get',
        pagerClass: 'pagination',
        idField: 'id',
        singleSelect: false,
        checkCls: "checkCls",
        sortCls: "sort",
        ascCls: "asc",
        descCls: "desc",
        orderbyColumn: "",
        orderbyDirection: 0,
        cache: false,
        currentPage: 1,
        pageSize: 50,
        pageSizeList: [10, 20, 50, 100],
        enableGotoPage: false,
        params: {},
        onClickRow: function (index, row) {
        },
        noDataTips: "未找到符合条件的数据",
        firstTotal: 0,
        firstTotalShow:true,
        afterTableRender: null,
        loadingFrag: '<div class="loading"><span></span></div>'
    }
})(jQuery);