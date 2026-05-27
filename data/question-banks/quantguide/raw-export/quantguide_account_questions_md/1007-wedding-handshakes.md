# QuantGuide Question

## 1007. Wedding Handshakes

**Metadata**

- ID: `ge9CYXGv9XpOp7iI7bUh`
- URL: https://www.quantguide.io/questions/wedding-handshakes
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Blackedge Capital, Five Rings
- Source: Kaushik - Blackedge OA
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-5 09:56:18 America/New_York
- Last Edited By: Gabe

### 题干

At a wedding of $100$ people, each person shakes hands with every other person once. How many handshakes occur in total?

### Hint

Start with a smaller scenario or think of a mathematical operation that models this situation well. 

### 解答

There are a couple ways to do this question. The fastest method is to realize that $\binom{100}{2}$ perfectly models this situation as we see how many different pairs of people can be chosen from the $100$. This results in the answer of $4950$. The other method is to start with a smaller scenario. Start with $1$ person. Every time another person joins the wedding, they have to shake hands with the current number of guests. This means the total number of handshakes is the integer sums from $1$ to $99$. There are $49$ sets of $100$ within this sum and an extra $50$ which results in a total of $4950$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4950"
    ],
    "companies": [
      {
        "company": "Blackedge Capital"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "ge9CYXGv9XpOp7iI7bUh",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 09:56:18 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8195240,
    "source": "Kaushik - Blackedge OA",
    "status": "published",
    "tags": [],
    "title": "Wedding Handshakes",
    "topic": "brainteasers",
    "urlEnding": "wedding-handshakes",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Blackedge Capital"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "id": "ge9CYXGv9XpOp7iI7bUh",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Wedding Handshakes",
    "topic": "brainteasers",
    "urlEnding": "wedding-handshakes"
  }
}
```
