# QuantGuide Question

## 864. Good Accuracy

**Metadata**

- ID: `EQRJ2VPobgoMsGsXJti8`
- URL: https://www.quantguide.io/questions/good-accuracy
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: IMC
- Source: IMC edited
- Tags: Combinatorics, Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 22:25:14 America/New_York
- Last Edited By: Gabe

### 题干

A dartboard consists of $3$ concentric circular regions of radii $1,2,$ and $3$. If you shoot $3$ darts that land in a uniformly random spot on the dartboard, find the probability that each lands in a distinct region. 

### Hint

The total area of the dartboard is $9\pi$, as the circles are concentric. The area of the circle of radius $1$ is just $\pi$. The area of the second region is $(2^2 - 1^2)\pi = 3\pi$, as the circles are concentric. 

### 解答

The total area of the dartboard is $9\pi$, as the circles are concentric. The area of the circle of radius $1$ is just $\pi$. The area of the second region is $(2^2 - 1^2)\pi = 3\pi$, as the circles are concentric. Lastly, the area of the third region is $(3^2 - 2^2)\pi  = 5\pi$. Therefore, the probability of the dart landing in each of the three regions is, respectively, $\dfrac{1}{9}, \dfrac{3}{9},$ and $\dfrac{5}{9}$. There are $3! = 6$ orders in which we can land in the three regions. Additionally, the probability of any such particular ordering is $\dfrac{1 \cdot 3 \cdot 5}{9^3} = \dfrac{5}{243}$. Therefore, the probability of landing in the three distinct regions in $3$ shots is $$3! \cdot \dfrac{5}{243} = \dfrac{10}{81}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "10/81"
    ],
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "EQRJ2VPobgoMsGsXJti8",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 22:25:14 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7054318,
    "source": "IMC edited",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Good Accuracy",
    "topic": "probability",
    "urlEnding": "good-accuracy"
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "id": "EQRJ2VPobgoMsGsXJti8",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Good Accuracy",
    "topic": "probability",
    "urlEnding": "good-accuracy"
  }
}
```
