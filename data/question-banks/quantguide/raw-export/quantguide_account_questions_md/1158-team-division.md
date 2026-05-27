# QuantGuide Question

## 1158. Team Division

**Metadata**

- ID: `Dba6OaF8UipRW9yNIWZH`
- URL: https://www.quantguide.io/questions/team-division
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: IMC
- Source: IMC
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

There are $12$ employees at QuantGuide. $3$ employees will work on the Software Engineering Team, $4$ employees will work on the Content Development Team, and $5$ employees will work on the Marketing team. Before assigning the employees, Michael and Nuo Wen admit that they don't want to be on the Marketing team. Under this restriction, how many ways can the employees at QuantGuide be assigned to teams?

### Hint

There are $10$ employees available to select for Marketing, as Michael and Nuo Wen do not want to be selected for it. We choose $5$ of these $10$ to be assigned to Marketing.

### 解答

There are $10$ employees available to select for Marketing, as Michael and Nuo Wen do not want to be selected for it. We choose $5$ of these $10$ to be assigned to Marketing, which can be done in $\displaystyle \binom{10}{5}$ ways. Then, there are $7$ employees remaining, of which $4$ must be assigned to Content Development. The other $3$ we don't select for Content Development would be assigned to Software Engineering, so there are $\displaystyle \binom{7}{4}$ ways to pick the people for Content Development. By the multiplication rule, the total number of ways to assign people is $$\displaystyle \binom{10}{5}\binom{7}{4} = 8820$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "8820"
    ],
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "id": "Dba6OaF8UipRW9yNIWZH",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 9615557,
    "source": "IMC",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Team Division",
    "topic": "probability",
    "urlEnding": "team-division"
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "id": "Dba6OaF8UipRW9yNIWZH",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Team Division",
    "topic": "probability",
    "urlEnding": "team-division"
  }
}
```
