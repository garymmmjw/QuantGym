# QuantGuide Question

## 481. Balanced Beans III

**Metadata**

- ID: `YTaYsHRjXPLGf7yAoF51`
- URL: https://www.quantguide.io/questions/balanced-beans-iii
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Belvedere Trading
- Source: Kaushik - Belv Glassdoor
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-8 09:25:29 America/New_York
- Last Edited By: Gabe

### 题干

There are $18$ beans, $17$ of which are identical and one that is heavier than the others. What is the minimum number of times a balance scale must be used to guarantee the determination of the abnormal bean?

### Hint

How should we evenly split our beans with each weighing?

### 解答

Since we know the abnormal bean is heavier than the others, at each weighing, we can divide our prospective beans by a factor of $3$. In this problem, we first make $3$ groups of $6$ beans and weigh $2$ of them on the balance. If they are not balanced, we know the heavier side has the abnormal bean. Otherwise, if the balances are level, we know the abnormal bean is in the group that wasn't weighed. We do this again (split the $6$ potential beans into $3$ groups of $2$) and find the group of $2$ in which the abnormal bean is a part of. Then we can simply weigh one bean on either side to find the heavier one. Thus it takes a total of $3$ weighings. 
$$$$

If we were to generalize this for any $n$ beans where one is known to be heavier than the others, then the answer is simply $\text{ceiling}(\log_3(n))$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3"
    ],
    "companies": [
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "YTaYsHRjXPLGf7yAoF51",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 09:25:29 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3838729,
    "source": "Kaushik - Belv Glassdoor",
    "status": "published",
    "tags": [],
    "title": "Balanced Beans III",
    "topic": "brainteasers",
    "urlEnding": "balanced-beans-iii",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "medium",
    "id": "YTaYsHRjXPLGf7yAoF51",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Balanced Beans III",
    "topic": "brainteasers",
    "urlEnding": "balanced-beans-iii"
  }
}
```
