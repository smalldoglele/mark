package com.zhongjinkehua.mark.object;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.jdbi.v3.core.Jdbi;

public class JdbiFactory {
    private Jdbi jdbi;

    public JdbiFactory() {
        HikariConfig config = new HikariConfig("/hikari.properties");
        HikariDataSource ds = new HikariDataSource(config);
        Jdbi jdbi3 = Jdbi.create(ds);
        //设置日志
        jdbi3.setSqlLogger(new CustomSqlLogger());
        //使用sqlObject插件
        //jdbi.installPlugin(new SqlObjectPlugin());
        this.jdbi = jdbi3;
    }
    public Jdbi get(){
        return jdbi;
    }
}
