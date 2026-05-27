# QuantGuide Question

## 302. Bowl of Cherries I

**Metadata**

- ID: `aYudmjiJfTBwqxFarVuz`
- URL: https://www.quantguide.io/questions/bowl-of-cherries-i
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Arrowstreet Capital
- Source: N/A
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 20:09:20 America/New_York
- Last Edited By: Gabe

### 题干

Amy has a bowl of 5 red cherries and 8 purple cherries. She takes out cherries one at a time until there are no red cherries left. What is the probability that the bowl is empty?

### Hint

The only way for Amy to have no cherries left is if the last cherry drawn from the bowl is red. We're therefore left with a simple ordering problem: how many ways can Amy order $m$ indistinguishable red cherries and $n$ indistinguishable purple cherries such that the last cherry is red?

### 解答

The only way for Amy to have no cherries left is if the last cherry drawn from the bowl is red. We're therefore left with a simple ordering problem: how many ways can Amy order $m$ indistinguishable red cherries and $n$ indistinguishable purple cherries such that the last cherry is red? $$$$

We take one red cherry and force it to be drawn last. Then, we have $m-1$ red cherries and $n$ purple cherries to arrange however we would like. Correcting for overcounting (since red cherries are indistinguishable from each other and purple cherries are indistinguishable from each other), we find that there are 
\[\begin{aligned}
    \frac{(m + n - 1)!}{(m-1)!\,n!}
\end{aligned}\]
possible orderings. $$$$

There are a total of 
\[\begin{aligned}
    \frac{(m + n)!}{m! \, n!}
\end{aligned}\]
possible orderings of the $m$ red and $n$ purple cherries without the restriction. $$$$

Therefore, the probability that the bowl is empty (the last cherry draw from the bowl is red) is
\[\begin{aligned}
    \frac{\frac{(m + n - 1)!}{(m-1)!\,n!}}{\frac{(m + n)!}{m! \, n!}} &= \frac{m}{m + n} = \frac{5}{13}
\end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5/13"
    ],
    "companies": [
      {
        "company": "Arrowstreet Capital"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "aYudmjiJfTBwqxFarVuz",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 20:09:20 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2365496,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Bowl of Cherries I",
    "topic": "probability",
    "urlEnding": "bowl-of-cherries-i"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Arrowstreet Capital"
      }
    ],
    "difficulty": "medium",
    "id": "aYudmjiJfTBwqxFarVuz",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Bowl of Cherries I",
    "topic": "probability",
    "urlEnding": "bowl-of-cherries-i"
  }
}
```
