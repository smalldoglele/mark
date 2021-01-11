package com.zhongjinkehua.mark;

import com.zhongjinkehua.mark.object.*;
import org.eclipse.jetty.util.StringUtil;
import org.jdbi.v3.core.Jdbi;
import spark.ModelAndView;
import spark.template.thymeleaf.ThymeleafTemplateEngine;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static spark.Spark.*;

public class App {

    private static Jdbi jdbi = new JdbiFactory().get();

    public static void main(String[] args) {

        staticFiles.location("public");

        get("/hello", (req, res) -> "Hello World");

        get("goods/category", (req, res) -> {
            List<String> categoryList = jdbi.withHandle(handle ->
                    handle.createQuery("SELECT DISTINCT category_name FROM `goods`")
                            .mapTo(String.class).list()
            );

            final QMap resultMap = new QMap();
            resultMap.setSuccess(true);
            resultMap.setData(categoryList);
            return resultMap;
        }, new JsonTransformer());

        get("goods/list", (req, res) -> {
            System.out.println(req.params());
            System.out.println(req.queryMap());
            Integer currentPage1 = Integer.parseInt(safeInt(req.queryMap("pageNum").value()));
            Integer pageSize1 = Integer.parseInt(safeInt(req.queryMap("pageSize").value()));
            String categoryName = req.queryMap("category_name").value();

            final Integer pageSize = pageSize1 == 0 ? 10 : pageSize1;
            final Integer currentPage = currentPage1 < 1 ? 1 : currentPage1;
            StringBuilder where=new StringBuilder(" where");
            if(StringUtil.isNotBlank(categoryName)){
                where.append(" category_name='"+categoryName+"'");
            }
            if(where.toString().equals(" where")){
                where=new StringBuilder();
            }
            final String  whereSql=where.toString();
            Optional<Integer> totalCount = jdbi.withHandle(handle ->
                    handle.createQuery("select count(*) from goods"+whereSql)
                            .mapTo(Integer.class).findOne()
            );

            List<Goods> goodsList = jdbi.withHandle(handle ->
                    handle.createQuery("select * from goods "+whereSql+" LIMIT ?,?")
                            .bind(0, (currentPage - 1) * pageSize).bind(1, pageSize)
                            .mapToBean(Goods.class)
                            .list()
            );
            final Pager<Goods> goodsPage = new Pager<>(currentPage, pageSize, totalCount.get(), goodsList);
            final QMap resultMap = new QMap();
            resultMap.setSuccess(true);
            resultMap.setData(goodsPage);
            return resultMap;
        }, new JsonTransformer());
        /**
         * 选择商品
         */
        get("goods/check", "application/json", (req, res) -> {
            Long goodsId = Long.parseLong(req.queryMap("goodsId").value());
            Integer checkFlag = Integer.parseInt(req.queryMap("checkFlag").value());
            Integer qty = Integer.parseInt(req.queryMap("qty").value());
            jdbi.withHandle(handle -> {
                String sql = "update goods set check_flag =?,order_qty=? where id=?";

                handle.createUpdate(sql)
                        .bind(0, checkFlag).bind(1, qty)
                        .bind(2,goodsId)
                        .execute();
                return 0;
            });
            return true;
        }, new JsonTransformer());
        /**
         * 订购商品
         */
        get("goods/order", "application/json", (req, res) -> {
            Long id = Long.parseLong(req.queryMap("id").value());
            Integer qty = Integer.parseInt(req.queryMap("qty").value());
            jdbi.withHandle(handle -> {
                String sql = "update goods set order_qty=? where id=? ";
                handle.createUpdate(sql)
                        .bind(0, qty).bind(1, id)
                        .execute();
                return 0;
            });
            return true;
        }, new JsonTransformer());


        redirect.get("/", "goods/index");

        get("goods/index", (req, res) -> {
            Map<String, Object> model = new HashMap<>();
            return render(model, "index");
        });

    }

    private static String safeInt(String str) {
        return str == null ? "0" : str;
    }

    /**
     * 使用thymeleaf 渲染页面
     *
     * @param model
     * @param templatePath
     * @return
     */
    public static String render(Map<String, Object> model, String templatePath) {
        return new ThymeleafTemplateEngine().render(new ModelAndView(model, templatePath));
    }
}
