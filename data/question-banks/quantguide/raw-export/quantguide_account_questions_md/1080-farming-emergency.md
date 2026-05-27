# QuantGuide Question

## 1080. Farming Emergency

**Metadata**

- ID: `13VOLvok7whWy7XHr69Y`
- URL: https://www.quantguide.io/questions/farming-emergency
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: IMC
- Source: aaron
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-2 20:32:26 America/New_York
- Last Edited By: Gabe

### 题干

A farming company has been hired to till $11$ plots of land. $4$ farmers are initially hired. It takes them a total of $5$ hours to till $2$ of the plots. The farming company decides to enlist more farmers to finish up the job within the next $12$ hours. What is the minimum number of additional farmers the company could have sent so that the other $9$ plots of land are tilled in the next $12$ hours? You may assume all plots takes the same time to till, individual farmers work at equal constant rates, and that they will work at the same efficiency regardless of the number of farmers there. 

### Hint

Let $x$ be the rate at which an individual farmer tills per hour. Try to find $x$ using the given information about the work rate of the farmers. 

### 解答

Let $x$ be the rate at which an individual farmer tills per hour. There were $20$ "farmer hours" of work to till $2$ plots of land, as there were $4$ farmers working for $5$ hours. Therefore, $20x = 2$, so $x = \dfrac{1}{10}$. $$$$Our job is to find the minimal integer $n$ such that $\dfrac{1}{10}\cdot (4 + n) \cdot 12 \geq 9$. 

This is since there would be $4+n$ farmers if $n$ farmers are sent and they work for $12$ hours, so we would be $12(4+n)$ farmer hours. Solving this, we get that $n \geq \dfrac{7}{2}$. This means that $n = 4$, as $n$ must be an integer.$$$$ To confirm this answer, we see that with $8$ total farmers, they would work at a rate of $\dfrac{1}{10} \cdot 8 = \dfrac{4}{5}$ of a plot per hour, so it would take them $\dfrac{45}{4} < 12$ hours to till $9$ plots.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4"
    ],
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "13VOLvok7whWy7XHr69Y",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-2 20:32:26 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8801881,
    "randomizable": "",
    "source": "aaron",
    "status": "published",
    "tags": [],
    "title": "Farming Emergency",
    "topic": "brainteasers",
    "urlEnding": "farming-emergency",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "id": "13VOLvok7whWy7XHr69Y",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Farming Emergency",
    "topic": "brainteasers",
    "urlEnding": "farming-emergency"
  }
}
```
