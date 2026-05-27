# QuantGuide Question

## 667. Primes and Composites

**Metadata**

- ID: `AxYNdrpaeTmOLDj6gsrI`
- URL: https://www.quantguide.io/questions/primes-and-composites
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: SIG
- Source: Kaushik - SIG Glassdoor
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-8-28 18:17:00 America/New_York
- Last Edited By: Gabe

### 题干

There is a game where an integer is picked uniformly between $2$ and $10$ inclusive. You win $\$n$ if the integer is prime and lose $\$\frac{n}{2}$ if its composite (where $n$ is the integer picked). How much would you pay to play this game? If you don’t wish to play, enter $0$.

### Hint

Write down all the outcomes and if they are prime or composite. 

### 解答

Let's split up all the outcomes into prime and composite. 
$$
\\
\text{Primes:} \hspace{3pt} 2, 3, 5, 7
\\
\text{Composites:} \hspace{3pt} 4, 6, 8, 9, 10
\\
$$
The EV of this game comes out to $(2+3+5+7-2-3-4-4.5-5)/9 = -\frac{1}{6}$.
Since the EV is negative, the answer is $0$.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "AxYNdrpaeTmOLDj6gsrI",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-28 18:17:00 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5348854,
    "source": "Kaushik - SIG Glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Primes and Composites",
    "topic": "probability",
    "urlEnding": "primes-and-composites",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "AxYNdrpaeTmOLDj6gsrI",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Primes and Composites",
    "topic": "probability",
    "urlEnding": "primes-and-composites"
  }
}
```
