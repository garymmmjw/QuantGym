# QuantGuide Question

## 876. Consecutive 1s

**Metadata**

- ID: `rq1R5Q5CrE6tt14qyJtb`
- URL: https://www.quantguide.io/questions/consecutive-1s
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: TransMarket Group
- Source: Kaushik - TMG Glassdoor
- Tags: Events
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-8 18:16:40 America/New_York
- Last Edited By: Gabe

### 题干

You toss a dice $5$ times and record the outcomes each time. What is the probability of throwing at least $3$ consecutive ones within those $5$ rolls?

### Hint

Count all the possibilities that fit our criteria.

### 解答

This question is simple enough that we can count the outcomes that fit our criteria. First are all the outcomes with $3$ ones in a row. These include:
$$$$
$\cdot 111xx$
$$$$
$\cdot 111x1$
$$$$
$\cdot x111x$
$$$$
$\cdot xx111$
$$$$
$\cdot 1x111$
$$$$
Now for $4$ ones in a row:
$$$$
$\cdot 1111x$
$$$$
$\cdot x1111$
$$$$
Finally, there’s only one way to get $5$ ones in a row:
$$$$
$\cdot 11111$
$$$$

$$$$
Now we need to find the probability of each of these outcomes and then we can add them up. The probability of having $3$ ones and $2$ non-ones is $\left(\frac{1}{6}\right)^3\cdot\left(\frac{5}{6}\right)^2$. Similarly, the probability of having $4$ ones and a non-one is $(\frac{1}{6})^4\cdot(\frac{5}{6})$. Finally, all ones has a probability of $(\frac{1}{6})^5$. There are $3$ possibilities with only $3$ ones, $4$ possibilities with $4$ ones, and $1$ possibility with $5$ ones. Thus our answer becomes$$3\cdot\left(\dfrac{1}{6}\right)^3\cdot\left(\dfrac{5}{6}\right)^2+4\cdot\left(\dfrac{1}{6}\right)^4\cdot\left(\dfrac{5}{6}\right)+\left(\dfrac{1}{6}\right)^5 = \dfrac{1}{81}$$


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/81"
    ],
    "companies": [
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "rq1R5Q5CrE6tt14qyJtb",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-8 18:16:40 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7172567,
    "source": "Kaushik - TMG Glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Consecutive 1s",
    "topic": "probability",
    "urlEnding": "consecutive-1s",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "id": "rq1R5Q5CrE6tt14qyJtb",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Consecutive 1s",
    "topic": "probability",
    "urlEnding": "consecutive-1s"
  }
}
```
