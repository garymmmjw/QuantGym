# QuantGuide Question

## 78. Conditional Head Starter

**Metadata**

- ID: `GSB7AuCoaSZ6bubpp1rt`
- URL: https://www.quantguide.io/questions/conditional-head-starter
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Five Rings
- Source: og
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-31 08:39:13 America/New_York
- Last Edited By: Gabe

### 题干

A fair coin is flipped $n$ times. It turns out that no heads appear consecutively in the sequence. Given this information, in terms of $n$, find the probability that the first flip was a heads. You should get a function $p(n)$. Evaluate $p(10)$.

### Hint

Condition on the sequence starting with $T$ or $HT$ and derive a recurrence relation.

### 解答

Let $A(n)$ be the number of sequences of length $n$ with no consecutive heads. Then $A(1) = 2$ and $A(2) = 3$ (only $HH$ doesn't satisfy this). For a sequence of length $n$ to satisfy our constraint, it either starts with $T$ or $HT$. It can't start with $HH$, as that would violate the condition. 

$$$$

There are $A(n-1)$ sequences starting with $T$ that satisfy this condition, as the first flip is $T$ and the other $n-1$ spots must not contain any consecutive heads. There are $A(n-2)$ sequences starting with $HT$ by the same logic with with $n-2$ remaining spots. Thus, $A(n) = A(n-1) + A(n-2)$ with $A(1) = 2$ and $A(2) = 3$. This is just the Fibonacci sequence shifted. In particularly, $A(n) = F_{n+2}$, where $F_k$ is the $k$th Fibonacci number. 

$$$$

Given this information, all sequences that satisfy the condition are equally likely. We know that there are $A(n-2)$ sequence starting with $HT$ (and hence $H$) out of the $A(n)$ total. Therefore, we get that $$p(n) = \dfrac{A(n-2)}{A(n)} = \dfrac{F_n}{F_{n+2}}$$ In particular, $p(10) = \dfrac{F_{10}}{F_{12}} = \dfrac{55}{144}$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "55/144"
    ],
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "GSB7AuCoaSZ6bubpp1rt",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-31 08:39:13 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 538323,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Conditional Head Starter",
    "topic": "probability",
    "urlEnding": "conditional-head-starter",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "id": "GSB7AuCoaSZ6bubpp1rt",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Conditional Head Starter",
    "topic": "probability",
    "urlEnding": "conditional-head-starter"
  }
}
```
