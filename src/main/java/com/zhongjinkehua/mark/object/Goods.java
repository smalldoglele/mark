package com.zhongjinkehua.mark.object;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class Goods {
    private Long id;
    private String code;
    private String name;
    private String imgUrl;
    private String categoryName;
    private BigDecimal price;
    private String unit;
    private Integer buyLimitStart;
    private Integer checkFlag;// 0 未选择 1 已选择
    private Integer orderQty;// 0 未选择 1 已选择
}
