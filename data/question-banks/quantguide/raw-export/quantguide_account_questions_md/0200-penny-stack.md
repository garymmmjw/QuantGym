# QuantGuide Question

## 200. Penny Stack

**Metadata**

- ID: `mD0CtwSOBit9O9XTdDsl`
- URL: https://www.quantguide.io/questions/penny-stack
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Jane Street
- Source: Jane Street
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 11:54:29 America/New_York
- Last Edited By: Gabe

### 题干

You are given $100$ pennies. You may arrange these pennies into however many stacks you want and put as many pennies into each stack as you would like. You are paid out the product of the number of pennies among all of the stacks. For example, if you make three stacks of sizes $10,20,$ and $70$, your payout is $10 \cdot 20 \cdot 70 = 14000$. The optimal arrangement of the pennies will give you a payout of $a \cdot b^c$, where $a$ and $b$ are relatively prime. Find $abc$. 

### Hint

The stacks should be of equal size roughly. Try starting with say $10$ stacks of $10$.

### 解答

We want to make the product as large as possible. Therefore, if we view the number of coins in each pile as a side length, we want to maximize our value as much as possible. A cube maximizes the volume here, which is the product of the side lengths, so we want to get to a cube or as close to it as possible. Let's start with $10$ stacks of $10$, as $100 = 10 \cdot 10$. If we divide each stack of $10$ into two stacks of $5$, then we get a larger product, as each stack of $10$ now contributes $5 \cdot 5 = 25$ to our product instead of $10$. Therefore, we now have $5$ stacks of $20$. However, as $5 = 3+2$ and $3 \cdot 2 = 6 > 5$, we should divide them up again. Now, we are going to try as many stacks of $3$ as possible. This would yields $33$ stacks of $3$ and a lone penny. However, this is not optimal, as removing one of our stacks of $3$ and putting it with the lone penny yields $4 \cdot 3^{32} > 3 \cdot 3^{32} = 3^{33}$. As we can't divide $4$ into anything more optimal, our solution is $4 \cdot 3^{32}$, so the answer to the answer is $4 \cdot 3 \cdot 32 = 384$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "384"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "mD0CtwSOBit9O9XTdDsl",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 11:54:29 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1520599,
    "source": "Jane Street",
    "status": "published",
    "tags": [],
    "title": "Penny Stack",
    "topic": "brainteasers",
    "urlEnding": "penny-stack"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "id": "mD0CtwSOBit9O9XTdDsl",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Penny Stack",
    "topic": "brainteasers",
    "urlEnding": "penny-stack"
  }
}
```
