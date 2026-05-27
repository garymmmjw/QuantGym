# QuantGuide Question

## 572. Proper Statement

**Metadata**

- ID: `xozfuFZcGbkAG0dHx1Dt`
- URL: https://www.quantguide.io/questions/proper-statement
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: AQR
- Source: cmu
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-2 22:39:53 America/New_York
- Last Edited By: Gabe

### 题干

A proper statement of length $2n$ is a string of characters consisting of $(,),\{$ and $\}$, where each of parentheses and curly braces are individually properly opened and closed. For example, $()\{\}$ and $\{()\}$ are proper statements, while $\{(\})$ and $((\})$ are not proper statements. Let $P_n$ be the number of proper statements of length $2n$. Find $P_5$.

### Hint

Use Catalan numbers $C_n$ for standard parenthesization.

### 解答

We solve this for more general $n$. The trick here is to refer back to the idea of Catalan numbers being proper parenthesizations of just $()$. There are $C_n$ such parenthesizations of length $2n$. Then, for each pair of parentheses, we have the option to select it as either parentheses or curly braces. Therefore, there are $2^n$ such ways we can select each pair being either parentheses or curly braces. Thus, $P_n = C_n \cdot 2^n$. In particular, $P_5 = C_5 \cdot 2^5 = \displaystyle \dfrac{1}{6} \cdot \binom{10}{5} \cdot 2^5 = 1344$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1344"
    ],
    "companies": [
      {
        "company": "AQR"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "xozfuFZcGbkAG0dHx1Dt",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-2 22:39:53 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4601149,
    "source": "cmu",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Proper Statement",
    "topic": "probability",
    "urlEnding": "proper-statement",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "AQR"
      }
    ],
    "difficulty": "medium",
    "id": "xozfuFZcGbkAG0dHx1Dt",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Proper Statement",
    "topic": "probability",
    "urlEnding": "proper-statement"
  }
}
```
