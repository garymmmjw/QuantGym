# QuantGuide Question

## 704. 5 Pairwise Sum

**Metadata**

- ID: `nacxZI9UgnUuVqqNbLrc`
- URL: https://www.quantguide.io/questions/5-pairwise-sum
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Five Rings, SIG
- Source: 5r r3
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-4 20:15:21 America/New_York
- Last Edited By: Gabe

### 题干

Let $S = \{a,b,c,d,e\}$ be a set of $5$ (possibly repeated) real numbers. The pair sums of elements in $S$ are: $$5, 11, 11, 13, 13, 14, 16, 19, 22, 22$$ Find $a^2 + b^2 + c^2 + d^2 + e^2$.

### Hint

Impose an ordering with $a \leq b \leq c \leq d \leq e$. What do you know about $4$ and $22$ now in terms of this ordering you imposed?

### 解答

We can impose an ordering with $a \leq b \leq c \leq d \leq e$. We then know that $a+b = 5$ and $d + e = 22$, as the smallest two integers must add up to the smallest sum and the two largest integers must add up to the largest sum. Additionally, we have that every single of the $a,b,c,d,$ and $e$ appears in $4$ of the $10$ pairwise sums, as each integer is added up to every other integer but itself. Therefore, if we sum up all the values in the list, the result is $4 \cdot (a + b + c + d + e)$. Adding these integers up yields $5 + 11 + 11 + 13 + 13 + 14 + 16 + 19 + 22 + 22 = 146$, so $4 \cdot (a + b + c + d + e) = 146$. However, we know $a + b = 5$ and $d + e = 22$, so we can get that $$4\cdot (5 + c + 22) = 146 \iff c = 9.5$$ The trick now is to note that by the ordering we have, $a+c$ must be the second smallest sum possible after $a+b$, so we have that $a+c = 11$, meaning $a = 1.5$. Since we know $a+b = 5$, we get that $b = 3.5$. By similar logic, we know that the second largest sum after $d+e$ is $c + e$, so we know that $22 = c + e$, meaning that $e = 12.5$. Lastly, since $d + e = 22$ as well, we know $d = c = 9.5$. Putting it all together, we obtained the solution $$(a,b,c,d,e) = (1.5,3.5,9.5,9.5,12.5)$$ Therefore, $a^2 + b^2 + c^2 + d^2 + e^2 = \dfrac{3^2 + 7^2 + 19^2 + 19^2 + 25^2}{2^2} = \dfrac{1405}{4}$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1405/4"
    ],
    "companies": [
      {
        "company": "Five Rings"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "nacxZI9UgnUuVqqNbLrc",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 20:15:21 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5751742,
    "source": "5r r3",
    "status": "published",
    "tags": [],
    "title": "5 Pairwise Sum",
    "topic": "brainteasers",
    "urlEnding": "5-pairwise-sum",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "hard",
    "id": "nacxZI9UgnUuVqqNbLrc",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "5 Pairwise Sum",
    "topic": "brainteasers",
    "urlEnding": "5-pairwise-sum"
  }
}
```
