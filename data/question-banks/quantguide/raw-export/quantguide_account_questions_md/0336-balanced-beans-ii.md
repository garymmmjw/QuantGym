# QuantGuide Question

## 336. Balanced Beans II

**Metadata**

- ID: `LPzIodQmqjhSoekQ5ves`
- URL: https://www.quantguide.io/questions/balanced-beans-ii
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 4
- Companies: SIG, Chicago Trading Company, Blackedge Capital, Citadel, Optiver, Virtu Financial, WorldQuant, IMC, DE Shaw, Belvedere Trading
- Source: Kaushik - Heard on the Street
- Tags: Games
- Premium: False
- Solution Free: False
- Version: 12
- Last Edited: 2023-11-7 13:32:24 America/New_York
- Last Edited By: Gabe

### 题干

There are $12$ beans; one weighs slightly heavier or lighter than the others. What is the minimum number of times a balance scale must be used to guarantee the determination of the abnormal bean?

### Hint

Start the same way we do for "Balanced Beans".

### 解答

The first step is similar to the other "Balanced Beans" problem and its to split the beans into $3$ groups of four. Put one group on one side and another group on the other side, leaving one group unweighted. The best case scenario is if the scale is balanced on both sides which means the abnormal bean is in the unweighted group. In this case, you can take two beans from that group and weigh them on either side. If the scale is balanced, you know the abnormal bean is one of the other two beans in the $3^{\text{rd}}$ group. Thus you can pick one of these two beans and replace either side with that bean. If the scale continues to stay balanced, you know the last bean (never touched the scale) is the abnormal one. Otherwise, its the new bean you put on the scale. Its a similar approach if the scales are not balanced after you selected two beans from the $3^{\text{rd}}$ group. You replace one side with a bean you know is normal and if it continues to remain unbalanced, the bean that stayed on the scale is abnormal. Otherwise its the bean you replaced with a normal bean.
$$$$
Now lets cover the more difficult situation where the two groups of four aren't balanced. The key realization with this problem is to move around subsets of each group, specifically subsets of three beans. Lets call the two groups of four on the scale Group 1 (left side) and Group 2 (right side) while the unweighted group is Group 3. We take three beans from Group 1 and move them to Group 2, take three beans from Group 2 and move them to Group 3, and three beans from Group 3 and move them to Group 1. Now the best case scenario is the balance doesn't change its orientation (if the left side was lighter before the moving of groups of three, it continues to stay lighter). This is the best case scenario because we know the abnormal bean is either the bean that didn't move from from Group 1 or the bean that didn't move from Group 2. We can easily deduce which one is the abnormal one by weighing one of these beans against a known normal bean and deduce if the bean weighed is the normal or abnormal bean. 
$$$$
Lets say the scale does change orientation after the $2^{\text{nd}}$ weighing. If the scale flips orientations (still unbalanced but not the same side being lighter than the other), then we know the abnormal bean was in the group of three beans we moved from Group 1 to Group 2. We would also know if this bean is lighter or heavier than the others. If the left side (Group 1) weighed more than the right (Group 2), and it flipped to the right weighing more, then we know the abnormal bean weighs more than the others. Same thing if its lighter but we'd notice the left side going from being lighter to heavier. Weigh any two beans from this group of three that's currently in Group 2 to deduce the abnormal bean. Lets go back to the case where the scales were originally unbalanced but after the 2nd weighing, the becomes balanced. This means that the abnormal bean is in the group of three we moved from Group 2 to Group 3. We would also know if this bean is heavier or lighter than the others as we could remember if the right side (Group 2) was up or down after the second weighing. Now weigh any two beans from this group of three to deduce the abnormal bean. The total number of $3$ weightings needed to guarantee you know which bean is the abnormal one. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Chicago Trading Company"
      },
      {
        "company": "Blackedge Capital"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "Virtu Financial"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "IMC"
      },
      {
        "company": "DE Shaw"
      },
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "LPzIodQmqjhSoekQ5ves",
    "internalDifficulty": 4,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 13:32:24 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2586137,
    "randomizable": "",
    "source": "Kaushik - Heard on the Street",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Balanced Beans II",
    "topic": "brainteasers",
    "urlEnding": "balanced-beans-ii",
    "version": 12
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Chicago Trading Company"
      },
      {
        "company": "Blackedge Capital"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "Virtu Financial"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "IMC"
      },
      {
        "company": "DE Shaw"
      },
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "hard",
    "id": "LPzIodQmqjhSoekQ5ves",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Balanced Beans II",
    "topic": "brainteasers",
    "urlEnding": "balanced-beans-ii"
  }
}
```
