# QuantGuide Question

## 407. Equal Money

**Metadata**

- ID: `XMc9mojrV6KQVjkROeTh`
- URL: https://www.quantguide.io/questions/equal-money
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: 536
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-6 10:39:03 America/New_York
- Last Edited By: Gabe

### 题干

$$9$ boys and $3$ girls have some amount of money that they plan to equally share. Every boy gave an equal sum to every girl, and every girl gave another equal sum to every boy. Girls start out with more money than boys. Every child then possessed exactly the same amount. What is the smallest possible amount that every person possesses at the end? The money can be as granular as individual cents.

### Hint

Set up an equation to represent this in terms of starting money per gender and how much each gives. You should get an equation involving  $12$ somewhere.

### 解答

Let $b$ and $g$ be the amount of money that boys and girls started with, respectively. Then, if each boy gives $s_1$ to each girl and each girl gives $s_2$ to each boy, then we want $b - 3s_1 + 3s_2 = g - 9s_2 + 9s_1$. This means that $12(s_2-s_1) = g-b$. Since $12$ needs to cleanly divide the number of pennies and girls start with more money, we could let $g - b = 0.12$. The smallest way to obtain this without anyone having negative money is if $g = 0.24$ and $b = 0.12$. Then, since both genders need to give money to one another, let $s_2 = 0.02$ and $s_1 = 0.01$. We would thus have that everyone has $0.15$ at the end.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.15"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "XMc9mojrV6KQVjkROeTh",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-6 10:39:03 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3196226,
    "source": "536",
    "status": "published",
    "tags": [],
    "title": "Equal Money",
    "topic": "brainteasers",
    "urlEnding": "equal-money",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "XMc9mojrV6KQVjkROeTh",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Equal Money",
    "topic": "brainteasers",
    "urlEnding": "equal-money"
  }
}
```
