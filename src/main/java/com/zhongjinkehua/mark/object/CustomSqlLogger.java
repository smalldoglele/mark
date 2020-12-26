package com.zhongjinkehua.mark.object;

import org.jdbi.v3.core.statement.Binding;
import org.jdbi.v3.core.statement.ParsedSql;
import org.jdbi.v3.core.statement.SqlLogger;
import org.jdbi.v3.core.statement.StatementContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class CustomSqlLogger implements SqlLogger {

    Logger logger = LoggerFactory.getLogger(CustomSqlLogger.class);

    @Override
    public void logBeforeExecution(StatementContext context) {
        logger.info(">>>>:{}", context.getParsedSql().getSql());
        logger.info(">>>>:{}", context.getBinding());
    }
}
